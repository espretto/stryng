/**
 * gulp v3.4.0, latest compatible with node v0.8 
 */

var fs = require('fs');
var sprintf = require('util').format;

var gulp = require('gulp');
var uglify = require('gulp-uglify');
var jshint = require('gulp-jshint');
var rename = require('gulp-rename');
var browserify = require('gulp-browserify');

var pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

/* -----------------------------------------------------------------------------
 * gulp tasks
 */

gulp.task('minify', function () {
  return gulp
    .src('./src/stryng.js')
    .pipe(uglify())
    .pipe(rename(sprintf('stryng.min-%s.js', pkg.version)))
    .pipe(gulp.dest('./dist/'));

      // uglify({
      //   mangle: false,
      //   preserveComments: 'all',
      //   output: { beautify: true },
      //   compress: {
      //     global_defs: { __COMPAT__: true }
      //     dead_code: true
      //   }
      // })
});


gulp.task('browserify', function (){
  return gulp.src('./test/stryng.unit.js')
    .pipe(browserify({ insertGlobals : true }))
    .pipe(rename('stryng.unit.bundle.js'))
    .pipe(gulp.dest('./test/'));
});


gulp.task('jshint', function() {
  return gulp.src([
      './src/stryng.js',
      './test/stryng.unit.js',
      // './test/stryng.opt.js', // %-natives throw
      './test/stryng.test.js',
      './gulpfile.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'))
    .pipe(jshint.reporter('fail'));
});


/* -----------------------------------------------------------------------------
 * task aggregates
 */

gulp.task('default', gulp.series('minify', 'browserify', 'jshint'));
