var _ = require('lodash');
var FormioUtils = require('formiojs/utils');
module.exports = function (formio) {
  var serialize = function(obj) {
    var str = [];
    for(var p in obj)
      if (obj.hasOwnProperty(p)) {
        str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
      }
    return str.join("&");
  };

  /**
   * The Form object.
   * @param form
   * @constructor
   */
  var Form = function (url) {
    this.form = null;
    this.url = url;
    this.currentSub = 0;
    this.numSubmissions = 0;
  };

  /**
   * Override the toJson method to return the form.
   * @returns {HTMLElement|*}
   */
  Form.prototype.toJson = function () {
    return this.form;
  };

  /**
   * Load the form.
   *
   * @returns {*|promise}
   */
  Form.prototype.load = function () {
    if (this.form) {
      var deferred = Q.defer();
      deferred.resolve(this.form);
      return deferred.promise;
    }
    else {
      return formio.request('get', this.url).then(function (res) {
        this.form = res.body;
        return this;
      }.bind(this));
    }
  };

  /**
   * Save a form.
   *
   * @returns {*|promise}
   */
  Form.prototype.save = function () {
    if (!this.form) {
      var deferred = Q.defer();
      deferred.reject('No form to save.');
      return deferred.promise;
    }
    else {
      return formio.request('put', this.url, this.form);
    }
  };

  /**
   * Create a new Form within a Project
   *
   * @param template
   *   The project template.
   * @returns {*}
   */
  Form.prototype.create = function (form) {
    return formio.request('post', this.url, form).then(function (res) {
      if (res.statusCode >= 300) {
        throw res.statusMessage;
      }
      this.form = res.body;
      this.url = this.url + '/form/' + this.form._id.toString();
      return this;
    }.bind(this));
  };

  /**
   * Iterate over each input component.
   *
   * @param eachComp
   * @param components
   * @returns {*}
   */
  Form.prototype.eachComponent = function (eachComp, components) {
    if (!this.form) {
      return this.load().then(function (form) {
        this.eachComponent(eachComp, form.components);
      }.bind(this));
    }
    else {
      components = components ? components : this.form.components;
      return FormioUtils.eachComponent(components, eachComp);
    }
  };

  /**
   * Submit data into a form.
   *
   * @param data
   */
  Form.prototype.submit = function (submission) {
    var method = submission._id ? 'put' : 'post';
    var url = this.url + '/submission';
    if (submission._id) {
      url += '/' + submission._id;
    }
    return formio.request(method, url, submission);
  };

  /**
   * Load some submissions.
   */
  Form.prototype.loadSubmissions = function(query) {
    query = query || {};
    query.limit = formio.config.pageSize;
    return formio.request('get', this.url + '/submission?' + serialize(query))
      .then(function (res) {
        return res.body;
      }.bind(this));
  };

  /**
   * Load a particular submission by its ID.
   */
  Form.prototype.loadSubmission = function(submissionId) {
    return formio.request('get', this.url + '/submission/' + submissionId)
      .then(function (res) {
        return res.body;
      }.bind(this));
  };

  /**
   * Retrieve all form actions.
   */
  Form.prototype.actions = function() {
    return formio.request('get', this.url + '/action')
  };

  /**
   * Iterate over each submission.
   *
   * @param eachSub
   * @returns {*|promise}
   */
  Form.prototype.eachSubmission = function (eachSub) {

    // Determine the end submission.
    var end = this.currentSub + (formio.config.pageSize - 1);
    end = (this.numSubmissions && (end > this.numSubmissions)) ? (this.numSubmissions - 1) : end;
    return formio.request('get', this.url + '/submission?limit=' + formio.config.pageSize, null, {
      'Range-Unit': 'items',
      'Range': this.currentSub + '-' + end
    }).then(function (res) {
      if (!this.numSubmissions) {
        var parts = res.headers['content-range'].split('/');
        this.numSubmissions = parseInt(parts[1], 10);
      }

      // Iterate through each submission.
      _.each(res.body, function (submission) {

        // Call the submission...
        eachSub(submission);
      });

      // Increase the current submission.
      this.currentSub += formio.config.pageSize;

      // If the current submisison is greater than the number of submissions, then we are done.
      if (this.currentSub < this.numSubmissions) {

        // Load the submissions again for the next page and return the promise.
        return this.eachSubmission(eachSub);
      }
    }.bind(this));
  };

  return Form;
};
