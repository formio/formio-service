var _ = require('lodash');
var Q = require('q');
var request = require('request');
var User = require('./src/User');
var Form = require('./src/Form');
var Project = require('./src/Project');

/**
 * The main Formio object.
 * @param _config
 * @constructor
 */
var Formio = function(_config) {
  _config = _config || {};
  this.config = _.defaults(_config, {
    formio: 'https://formio.form.io',
    api: 'https://api.form.io',
    pageSize: 20,
    key: ''
  });

  this.apiKey = this.config.key ? this.config.key : '';
  this.currentUser = null;
  this.User = User(this);
  this.Form = Form(this);
  this.Project = Project(this);
};

/**
 * Authenticate a new user.
 *
 * @param email
 * @param password
 * @param form
 * @returns {*}
 */
Formio.prototype.authenticate = function (email, password, form) {
  this.currentUser = new this.User(email, password);
  return this.currentUser.authenticate(form);
};

// Create an alias for login.
Formio.prototype.login = Formio.prototype.authenticate;

/**
 * Register a new user
 */
Formio.prototype.register = function(user, form) {
  this.currentUser = new this.User();
  return this.currentUser.register(user, form);
};

/**
 * Sets the user token
 */
Formio.prototype.setToken = function(token) {
  this.currentUser = new this.User();
  this.currentUser.token = token;
};

/**
 * Perform a request against the Form.io server.
 *
 * @param method
 * @param url
 * @param data
 * @param headers
 * @returns {*|(()=>Promise<D>)|(()=>Promise<SendData>)}
 */
Formio.prototype.request = function (method, url, data, headers) {
  var deferred = Q.defer();
  method = method || 'get';
  headers = _.defaults(headers || {}, {
    'Accept': 'application/json'
  });

  if (
    !headers.hasOwnProperty('x-jwt-token') &&
    !headers.hasOwnProperty('x-token') &&
    this.apiKey
  ) {
    headers['x-token'] = this.apiKey;
  }
  else if (
    !headers.hasOwnProperty('x-jwt-token') &&
    this.currentUser &&
    this.currentUser.token
  ) {
    headers['x-jwt-token'] = this.currentUser.token;
  }

  var options = {
    method: method.toUpperCase(),
    url: url,
    rejectUnauthorized: false,
    headers: headers,
    json: true
  };

  if (data) {
    options.body = data;
  }

  // Execute the request.
  try {
    request(options, function(err, response) {
      if (err) {
        return deferred.reject(err);
      }
      // Fail for anything other than 200 status code.
      if (parseInt(response.statusCode / 100, 10) !== 2) {
        var err = new Error(response.body);
        err.response = response;
        return deferred.reject(err);
      }
      deferred.resolve(response);
    });
  }
  catch(err) {
    deferred.reject(err);
  }
  return deferred.promise;
};

/**
 * The Form.IO interface.
 *
 * @param config - The configuration.
 */
module.exports = function (config) {
  // Return a new instance of the Formio interface.
  return new Formio(config);
};
