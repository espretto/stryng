module.exports = function( grunt ) {
  
  var 

  DOCS_OUT = 'docs/dist',
  DOCS_IN = [
    'README.md',
    'src/stryng.js'
  ];
  LIVERELOAD = true;

  grunt.initConfig( {

    clean: {
      docs: {
        src: DOCS_OUT,
      }
    },

    jshint: {
      options: {
        jshintrc: './.jshintrc'
      },
      all: ['src/stryng.js']
    },

    docker: {
      app: {
        expand: true,
        src: DOCS_IN,
        dest: DOCS_OUT + '/docker',
        options: {
          onlyUpdated: false,
          colourScheme: 'tango',

          // 'autumn'
          // 'borland'
          // 'bw'
          // 'colorful'
          // 'default'
          // 'emacs'
          // 'friendly'
          // 'fruity'
          // 'manni'
          // 'monokai'
          // 'murphy'
          // 'native'
          // 'pastie'
          // 'perldoc'
          // 'rrt'
          // 'tango'
          // 'trac'
          // 'vim'
          // 'vs'


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

    // jsdoc: {
    //   all: {
    //     src: DOCS_IN,
    //     options: {
    //       verbose: true,
    //       destination: DOCS_OUT,
    //       configure: 'docs/conf.json',
    //       template: 'docs/templates/jaguar',
    //       'private': false
    //     }
    //   }
    // },

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

    connect: {
      docs: {
        options: {
          livereload: LIVERELOAD,
          hostname: '*',
          keepalive: true,
          port: 8000,
          base: [DOCS_OUT, '']
        }
      }
    },

    watch: {
      options: {
        livereload: LIVERELOAD
      },
      jsdoc: {
        files: DOCS_IN.concat([
          'docs/conf.json'
        ]),
        tasks: ['jsdoc', 'grock', 'docker']
      }
    }

  } );

  // task libs
  [
    'grunt-contrib-connect',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-contrib-uglify',
    'grunt-contrib-jshint',
    'grunt-docker',
    'grunt-jsdoc',
  ].forEach( grunt.loadNpmTasks, grunt );

  // task definitions
  grunt.registerTask( 'default', 'Generate and serve documentation', [
    'clean:docs',
    'jsdoc',
    'docker',
    'connect:docs'
  ] );

  // try
  // ```
  // node_modules/.bin/grock --glob 'stryng.js'
  // ```
  // for [grock](https://github.com/killercup/grock)

}