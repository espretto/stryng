module.exports = function( grunt ) {
  grunt.initConfig( {

    clean: {
      docs: {
        src: 'docs/dist'
      }
    },

    jsdoc: {
      all: {
        src: [
          'README.md',
          'stryng.js'
        ],
        options: {
          verbose: true,
          destination: 'docs/dist',
          configure: 'docs/conf.json',
          template: 'docs/templates/jaguar',
          'private': false
        }
      }
    },

    connect: {
      docs: {
        options: {
          livereload: true,
          hostname: '*',
          keepalive: true,
          port: 8000,
          base: '/home/rasu/Development/nodejs/Stryng/docs/dist'
        }
      }
    },

    watch: {
      options: {
        livereload: true
      },
      jsdoc: {
        files: '<%= jsdoc.all.src %>',
        tasks: ['jsdoc:all']
      }
    }

  } );

  // Load task libraries
  [
    'grunt-contrib-connect',
    'grunt-contrib-watch',
    'grunt-contrib-clean',
    'grunt-jsdoc',
  ].forEach( grunt.loadNpmTasks, grunt );

  // Definitions of tasks
  grunt.registerTask( 'default', 'Generate and serve documentation', [
    'clean:docs',
    'jsdoc',
    'connect:docs'
  ] );

  // try
  // ```
  // node_modules/.bin/grock --glob 'stryng.js'
  // ```
  // for [grock](https://github.com/killercup/grock)

}