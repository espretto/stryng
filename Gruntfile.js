module.exports = function (grunt) {

  var DOCS_OUT = 'docs/dist',
    DOCS_IN = [
      'README.md',
      'src/stryng.js'
    ],
    LIVERELOAD = true;

  grunt.initConfig({

    clean: {
      docs: {
        src: DOCS_OUT,
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: ['src/stryng.js', 'Gruntfile.js', 'test/stryng.test.js']
    },

    docker: {
      app: {
        expand: true,
        src: DOCS_IN,
        dest: DOCS_OUT + '/docker',
        options: {
          onlyUpdated: false,
          colourScheme: 'tango',
          ignoreHidden: false,
          sidebarState: true,
          exclude: [],
          lineNums: true,
          js: [],
          css: [],
          extras: ['goToLine', 'fileSearch']
        }
      }
    },

    jsdoc: {
      all: {
        src: DOCS_IN,
        options: {
          destination: DOCS_OUT,
          template : 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
          configure : 'docs/jsdoc.conf.json'
        }
      }
    },

    uglify: {
      options: {
        // beautify: true,
        preserveComments: 'some',
        compress: {
          // global_defs: {
          //   "DEBUG": false
          // },
          // dead_code: true
        }
      },
      all: {
        files: {
          'dist/stryng.min.js': ['src/stryng.js']
        }
      }
    },

    browserify: {
      test: {
        files: {
          'test/stryng.test.bundle.js': 'test/stryng.test.js'
        }
      }
    }
  });

  // task libs
  [
    'grunt-contrib-clean',
    'grunt-contrib-uglify',
    'grunt-contrib-jshint',
    'grunt-browserify',
    'grunt-docker',
    'grunt-jsdoc'
  ].forEach(grunt.loadNpmTasks, grunt);

  // task definitions
  grunt.registerTask('doc', 'Generate and serve documentation', [
    'clean:docs',
    'jsdoc',
    'docker'
  ]);

  grunt.registerTask('default', [
    'jshint',
    'browserify',
    'uglify'
  ]);
};