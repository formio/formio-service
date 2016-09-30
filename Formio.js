var _ = require('lodash');
var util = require('util');

/**
 * The Form.IO interface.
 *
 * @param config - The configuration.
 *      - formio: The Form.IO application url.
 *      - pageSize: Change the page size when retrieving submissions.
 */
module.exports = function (config) {

  // Establish some defaults.
  config = config || {};
  config = _.defaults(config, {
    formio: 'https://formio.form.io',
    api: 'https://api.form.io',
    pageSize: 20,
    apiKey: ''
  });

  if (config.apiKey) {
    util.apiKey = config.apiKey;
  }

  // Get the classes.
  var User = require('./src/User')(config);
  var Form = require('./src/Form')(config);
  var Project = require('./src/Project')(config);

  return {

    /** The current user who is authenticated. */
    currentUser: null,

    /**
     * Authenticate against Form.IO.
     * @param email
     * @param password
     * @returns {*}
     */
    authenticate: function (email, password, form) {
      this.currentUser = new User(email, password);
      Form.setCurrentUser(this.currentUser);
      Project.setCurrentUser(this.currentUser);
      return this.currentUser.authenticate(form);
    },

    /** Expose the other classes. */
    User: User,
    Form: Form,
    Project: Project
  };

};