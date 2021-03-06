'use strict';

var fs     = require('fs');
var path   = require('path');
var assert = require('ember-cli/tests/helpers/assert');

describe('the deploy plugin object', function() {
  var fakeRoot;
  var plugin;
  var promise;
  var distDir;
  var jsonBlueprint;
  var context;

  before(function() {
    fakeRoot = process.cwd() + '/tests/fixtures';
    distDir = 'dist';
    jsonBlueprint = false;
  });

  beforeEach(function() {
    var subject = require('../../index');
    var jsonPath = fakeRoot + '/dist/index.json';
    if (fs.existsSync(jsonPath)) {
      fs.unlinkSync(jsonPath);
    }

    var mockUi = {write: function() {}, writeLine: function() {}};

    plugin = subject.createDeployPlugin({
      name: 'json-config'
    });

    context = {
      ui: mockUi,
      config: {
        'json-config': {
          fileInputPattern: 'index.html',
          fileOutputPattern: 'index.json',
          distDir: function(context) {
            return distDir;
          },
          projectRoot: function(context) {
            return fakeRoot;
          }
        }
      }
    };

    if (jsonBlueprint) {
      context.config['json-config'].jsonBlueprint = jsonBlueprint;
    }

    plugin.beforeHook(context);
    plugin.configure(context);

    promise = plugin.didBuild.call(plugin, context);
  });

  it('has a name', function() {
    assert.equal('json-config', plugin.name);
  });

  it('implements the correct hooks', function() {
    assert.equal(typeof plugin.configure, 'function');
    assert.equal(typeof plugin.didBuild, 'function');
  });

  describe('didBuild hook', function() {
    it('generates index.json from index.html', function() {
      return assert.isFulfilled(promise)
        .then(function() {
          var contents = fs.readFileSync(fakeRoot + '/dist/index.json');
          var json = JSON.parse(contents);

          assert.equal(Object.keys(json).length, 4);

          assert.deepEqual(json.base[0], { href: '/' });
          assert.deepEqual(json.meta[0], { name: 'my-app/config/environment', content: 'some-config-values' });
          assert.deepEqual(json.link[0], { rel: 'stylesheet', href: 'assets/vendor.css', integrity: 'sha256-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC' });
          assert.deepEqual(json.link[1], { rel: 'stylesheet', href: 'assets/app.css' });
          assert.deepEqual(json.script[0], { src: 'assets/vendor.js', integrity: 'sha256-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC' });
          assert.deepEqual(json.script[1], { src: 'assets/app.js' });
          assert.deepEqual(json.script[2], { });
        });
    });

    it ('returns the index.json path', function() {
      return assert.isFulfilled(promise)
        .then(function(result) {
          assert.deepEqual(result.distFiles, ['index.json']);
        });
    });

    describe('when the distDir is an absolute path', function() {
      before(function() {
        distDir = fakeRoot + '/dist';
      });

      it('still works', function() {
        return assert.isFulfilled(promise)
          .then(function() {
            var json = require(fakeRoot + '/dist/index.json');

            assert.equal(Object.keys(json).length, 4);
          });
      });
    });

    describe('when we ask for script tag contents', function() {
      before(function() {
        jsonBlueprint = {
          script: {
            selector: 'script',
            attributes: [],
            includeContent: true,
          }
        };
      });

      it('provides the contents of the script tag', function() {
        return assert.isFulfilled(promise)
          .then(function() {
            var contents = fs.readFileSync(fakeRoot + '/dist/index.json');
            var json = JSON.parse(contents);

            assert.equal(Object.keys(json).length, 1);

            assert.deepEqual(json.script[0], {});
            assert.deepEqual(json.script[1], {});
            assert.deepEqual(json.script[2], { content: "var a = 'foo';"});
          });
      });
    });
  });
});
