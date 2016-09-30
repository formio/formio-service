var request = require('request');
var _ = require('lodash');
var Q = require('q');
module.exports = {
  currentUser: null,
  apiKey: null,
  request: function (method, url, data, headers) {
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
      headers: headers,
      json: true
    };

    if (data) {
      options.body = data;
    }

    // Execute the request.
    request(options, function(err, response) {
      if (err) {
        return deferred.reject(err);
      }
      deferred.resolve(response);
    });
    return deferred.promise;
  }
};