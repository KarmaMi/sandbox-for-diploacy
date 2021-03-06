const gulp = require('gulp')
const gutil = require('gulp-util')
const source = require('vinyl-source-stream')
const buffer = require('vinyl-buffer')
const merge = require('merge2')

const ts = require('gulp-typescript')
const tsify = require('tsify')
const sourcemaps = require('gulp-sourcemaps')

const mocha = require('gulp-mocha')

const browserify = require('browserify')

const tsSourceProject = ts.createProject('./src/tsconfig.json')
const tsTestProject = ts.createProject('./test/tsconfig.json')
const tsCompilerOptions = require('./src/tsconfig.json').compilerOptions

// compile source files
gulp.task('compile-src', () => {
  const tsResult = gulp.src(['./src/**/*.ts', './src/**/*.tsx'])
    .pipe(sourcemaps.init())
    .pipe(tsSourceProject(ts.reporter.defaultReporter()))

  return merge([
    tsResult.dts.pipe(gulp.dest('./target/interface')),
    tsResult.js
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./target/src'))
  ])
})

// compile test files
gulp.task('compile-test', ['compile-src'], () => {
  return gulp.src(['./test/**/*.ts'])
    .pipe(tsTestProject(ts.reporter.defaultReporter()))
    .pipe(gulp.dest('./target/test'))
})

// Run test program
gulp.task('test', ['compile-src', 'compile-test'], () => {
  return gulp.src(['./target/test/**/*.js'])
    .pipe(mocha({ repoter: 'list' }))
    .on('error', gutil.log)
})
gulp.task('watch-test', () => gulp.watch(['src/**/*.ts', 'test/**/*.ts'], ['test']))

// Browserify this module
gulp.task('browserify', () => {
  const options = tsCompilerOptions
  browserify({entries: ['./src/index.tsx']})
  .plugin(tsify, options)
  .bundle()
  .pipe(source('sandbox.js'))
  .pipe(buffer())
  .pipe(sourcemaps.init())
  .pipe(sourcemaps.write('./'))
  .pipe(gulp.dest('docs/'))
})
gulp.task('watch-browserify', () => gulp.watch(['./index.js', 'src/**/*.ts', 'src/**/*.tsx'], ['browserify']))
