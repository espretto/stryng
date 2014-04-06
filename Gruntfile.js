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

    docker: {
      app: {
        expand: true,
        src: DOCS_IN,
        dest: DOCS_OUT + '/docker',
        options: {
          onlyUpdated: false,
          colourScheme: 'perldoc',
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

    grock: {
      options: {
        github: false,
        index: 'README.md',
        out: DOCS_OUT + '/grock',
        style: 'thin',
        verbose: true
      },
      files: DOCS_IN
    },

    jsdoc: {
      all: {
        src: DOCS_IN,
        options: {
          verbose: true,
          destination: DOCS_OUT,
          configure: 'docs/conf.json',
          template: 'docs/templates/jaguar',
          'private': false
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
          base: DOCS_OUT
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
    'grunt-docker',
    'grunt-grock',
    'grunt-jsdoc',
  ].forEach( grunt.loadNpmTasks, grunt );

  // task definitions
  grunt.registerTask( 'default', 'Generate and serve documentation', [
    'clean:docs',
    'jsdoc',
    'grock',
    'docker',
    'connect:docs'
  ] );

  // try
  // ```
  // node_modules/.bin/grock --glob 'stryng.js'
  // ```
  // for [grock](https://github.com/killercup/grock)

}