var request = require('request');
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
    var _request = function(query) {
        var deferred = Q.defer();
        request(query, function(error, response, body) {
            if (error) { return deferred.reject(error); }
            if ((response.statusCode < 200) || (response.statusCode >= 300)) { return deferred.reject(body); }
            try {
                body = JSON.parse(body);
            }
            catch (e) {
                return deferred.reject(e);
            }
            deferred.resolve({
                response: response,
                body: body
            });
        });
        return deferred.promise;
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
            return _request({
                url: this.formUrl,
                headers: {
                    'x-jwt-token': token
                }
            }).then(function (result) {
                this.form = result.body;
            }.bind(this));
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
            _.each(components, function(component) {
                if (component.columns && (component.columns.length > 0)) {
                    _.each(component.columns, function(column) {
                        this.eachComponent(column.components, eachComp);
                    }.bind(this));
                }
                else if (component.components && (component.components.length > 0)) {
                    this.eachComponent(component.components, eachComp);
                }
                else {
                    eachComp(component);
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
        return _request({
            url: this.formUrl + '/submission?limit=' + config.pageSize,
            headers: {
                'x-jwt-token': token,
                'Range-Unit': 'items',
                'Range': this.currentSub + '-' + end
            }
        }).then(function(result) {
            if (!this.numSubmissions) {
                var parts = result.response.headers['content-range'].split('/');
                this.numSubmissions = parseInt(parts[1], 10);
            }

            // Iterate through each submission.
            _.each(result.body, function(submission) {

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
            return _request({
                url: config.formio + '/user/login/submission',
                method: 'POST',
                form: {
                    data: {
                        'user.email': email,
                        'user.password': password
                    }

                }
            }).then(function(result) {
                token = result.response.headers['x-jwt-token'];
            });
        },

        /**
         * Export the Form object.
         */
        Form: Form
    };

};