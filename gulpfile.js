var gulp = require("gulp");

var cleanCSS = require("gulp-clean-css");
var sass = require("gulp-sass")(require("sass"));

var browserify = require("browserify");
var source = require("vinyl-source-stream");
var tsify = require("tsify");
var uglify = require("gulp-uglify");
var sourcemaps = require("gulp-sourcemaps");
var buffer = require("vinyl-buffer");

// sass.compiler = require('sass');

gulp.task("html", function () {
  return gulp.src("src/html/*.html").pipe(gulp.dest("dist"));
});

gulp.task("sass", function () {
  return gulp.src("src/scss/*.scss").pipe(sass()).pipe(cleanCSS()).pipe(gulp.dest("dist/css"));
});

gulp.task("typescript", function () {
  return browserify({
    entries: ["src/ts/script.ts"],
  })
    .plugin(tsify)
    .bundle()
    .pipe(source("bundle.js"))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(uglify())
    .pipe(sourcemaps.write("./"))
    .pipe(gulp.dest("dist/js"));
});

gulp.task("watch", function () {
  gulp.watch("src/**/*.html", gulp.series("html"));
  gulp.watch("src/**/*.scss", gulp.series("sass"));
  gulp.watch("src/**/*.ts", gulp.series("typescript"));
  // gulp.watch('src/xsl/**/*.xsl', gulp.series('xsl'));
});

gulp.task("default", gulp.series("html", "sass", "typescript", "watch"));
