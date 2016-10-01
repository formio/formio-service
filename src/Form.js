var util = require('./util');
var _ = require('lodash');
var formioUtils = require('formio-utils');
var Form = null;
module.exports = function (config) {
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
  Form = function (url) {
    this.form = null;
    this.url = url;
    this.currentSub = 0;
    this.numSubmissions = 0;
  };

  Form.setCurrentUser = function(user) {
    util.currentUser = user;
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

      // Send the request.
      return util.request('get', this.url).then(function (res) {
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
      return util.request('put', this.url, this.form);
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
    return util.request('post', this.url, form).then(function (res) {
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
      return formioUtils.eachComponent(components, eachComp);
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
    return util.request(method, url, submission);
  };

  /**
   * Load some submissions.
   */
  Form.prototype.loadSubmissions = function(query) {
    query = query || {};
    query.limit = config.pageSize;
    return util.request('get', this.url + '/submission?' + serialize(query))
      .then(function (res) {
        return res.body;
      }.bind(this));
  };

  /**
   * Iterate over each submission.
   *
   * @param eachSub
   * @returns {*|promise}
   */
  Form.prototype.eachSubmission = function (eachSub) {

    // Determine the end submission.
    var end = this.currentSub + (config.pageSize - 1);
    end = (this.numSubmissions && (end > this.numSubmissions)) ? (this.numSubmissions - 1) : end;

    // Return the promise.
    return util.request('get', this.url + '/submission?limit=' + config.pageSize, null, {
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
      this.currentSub += config.pageSize;

      // If the current submisison is greater than the number of submissions, then we are done.
      if (this.currentSub < this.numSubmissions) {

        // Load the submissions again for the next page and return the promise.
        return this.eachSubmission(eachSub);
      }
    }.bind(this));
  };

  return Form;
};