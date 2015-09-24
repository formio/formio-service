var superagent = require('superagent');
var _ = require('lodash');
var Q = require('q');

/**
 * The Form.IO interface.
 *
 * @param config - The configuration.
 *      - formio: The Form.IO application url.
 *      - pageSize: Change the page size when retrieving submissions.
 */
module.exports = function(config) {

    // Establish some defaults.
    config = config || {};
    config = _.defaults(config, {
        formio: 'https://formio.form.io',
        api: 'https://api.form.io',
        pageSize: 20
    });

    // Keep track of the auth token.
    var token = '';

    /**
     * A request in promise form.
     *
     * @param query
     * @returns {*|promise}
     * @private
     */
    var _request = function(method, url, data, headers) {
        var deferred = Q.defer();
        method = method || 'get';
        var request = superagent[method](url).set('Accept', 'application/json');
        if (headers) {
            _.each(headers, function(value, key) {
                request = request.set(key, value);
            });
        }
        if (data) {
            request = request.send(data);
        }
        request.end(function(err, res) {
            if (err) { return deferred.reject(err); }
            deferred.resolve(res);
        });
        return deferred.promise;
    };

    /**
     * The Project class.
     *
     * @param projectUrl
     * @constructor
     */
    var Project = function(projectUrl) {
        this.project = null;
        this.projectUrl = projectUrl;
    };

    /**
     * Create a new project in Form.io
     * @param template
     *   The project template.
     * @returns {*}
     */
    Project.prototype.create = function(template) {

        // Create a project from a template.
        var project = {
            title: template.title,
            description: template.description,
            name: template.name,
            template: _.omit(template, 'title', 'description', 'name'),
            settings: {cors: '*'}
        };

        // Send the request.
        return _request('post', config.api + '/project', project, {
            'x-jwt-token': token
        }).then(function (res) {
            this.project = res.body;
        }.bind(this));
    };

    /**
     * The Form object.
     * @param form
     * @constructor
     */
    var Form = function(formUrl) {
        this.form = null;
        this.formUrl = formUrl;
        this.currentSub = 0;
        this.numSubmissions = 0;
    };

    /**
     * Load the form.
     *
     * @returns {*|promise}
     */
    Form.prototype.load = function() {
        if (this.form) {
            var deferred = Q.defer();
            deferred.resolve(this.form);
            return deferred.promise;
        }
        else {

            // Send the request.
            return _request('get', this.formUrl, null, {
                'x-jwt-token': token
            }).then(function (res) {
                this.form = res.body;
            }.bind(this));
        }
    };

    /**
     * Save a form.
     *
     * @returns {*|promise}
     */
    Form.prototype.save = function() {
        if (!this.form) {
            var deferred = Q.defer();
            deferred.reject('No form to save.');
            return deferred.promise;
        }
        else {
            return _request('put', this.formUrl, this.form, {
                'x-jwt-token': token
            });
        }
    };

    /**
     * Iterate over each input component.
     *
     * @param eachComp
     * @param components
     * @returns {*}
     */
    Form.prototype.eachComponent = function(eachComp, components) {
        if (!this.form) {
            return this.load().then(function(form) {
                this.eachComponent(eachComp, form.components);
            }.bind(this));
        }
        else {
            components = components ? components : this.form.components;
            _.each(components, function(component, index) {
                if (component.columns && (component.columns.length > 0)) {
                    _.each(component.columns, function(column) {
                        this.eachComponent(eachComp, column.components);
                    }.bind(this));
                }
                else if (component.components && (component.components.length > 0)) {
                    this.eachComponent(eachComp, component.components);
                }
                else {
                    eachComp(component, index, components);
                }
            }.bind(this));
        }
    };

    /**
     * Iterate over each submission.
     *
     * @param eachSub
     * @returns {*|promise}
     */
    Form.prototype.eachSubmission = function(eachSub) {

        // Determine the end submission.
        var end = this.currentSub + (config.pageSize - 1);
        end = (this.numSubmissions && (end > this.numSubmissions)) ? (this.numSubmissions - 1) : end;

        // Return the promise.
        return _request('get', this.formUrl + '/submission?limit=' + config.pageSize, null, {
            'x-jwt-token': token,
            'Range-Unit': 'items',
            'Range': this.currentSub + '-' + end
        }).then(function(res) {
            if (!this.numSubmissions) {
                var parts = res.headers['content-range'].split('/');
                this.numSubmissions = parseInt(parts[1], 10);
            }

            // Iterate through each submission.
            _.each(res.body, function(submission) {

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

    return {

        /**
         * Authenticate against Form.IO.
         * @param email
         * @param password
         * @returns {*}
         */
        authenticate: function(email, password) {
            return _request('post', config.formio + '/user/login/submission', {
                data: {
                    'user.email': email,
                    'user.password': password
                }
            }).then(function(res) {
                token = res.headers['x-jwt-token'];
            });
        },

        /**
         * Export the Form object.
         */
        Form: Form,

        /**
         * Export the Project object.
         */
        Project: Project
    };

};