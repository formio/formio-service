var superagent = require('superagent');
var _ = require('lodash');
var Q = require('q');
module.exports = {
  request: function (method, url, data, headers) {
    var deferred = Q.defer();
    method = method || 'get';
    var request = superagent[method](url).set('Accept', 'application/json');
    if (headers) {
      _.each(headers, function (value, key) {
        request = request.set(key, value);
      });
    }
    if (data) {
      request = request.send(data);
    }
    request.end(function (err, res) {
      if (err) {
        return deferred.reject(err);
      }
      deferred.resolve(res);
    });
    return deferred.promise;
  }
};