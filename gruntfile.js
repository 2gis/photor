'use strict';

module.exports = function(grunt) {

    function getSpecs() {
        var result = [];

        // Return a unique array of all file or directory paths that match the given globbing pattern(s). 
        grunt.file.expand('tests/spec/*.js').forEach(function(filepath) {
            result.push(filepath);
        });

        return result;
    }

    grunt.initConfig({

        clean: {
            dist: ['dist/*']
        },

        concat: {
            js: {
                src: ['partials/start.js', 'src/**/*.js', 'partials/end.js'],
                dest: 'dist/photor.js'
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: ['src/**/*.js', 'gruntfile.js', 'libs/hand.js']
        },

        uglify: {
            regular: {
                files: {
                    'dist/photor.min.js': ['<%= concat.js.dest %>'],
                    'dist/hand.min.js': ['libs/hand.js'],
                    'dist/fast-click.js': ['libs/fast-click.js']
                }
            }
        },

        less: {
            regular: {
                files: {
                    'dist/photor.css': ['src/**/*.less']
                }
            }
        },

        csso: {
            regular: {
                files: {
                    'dist/photor.min.css': ['dist/photor.css']
                }
            }
        },

        connect: {
            server: {
                options: {
                    port: 3000,
                    base: ''
                }
            }
        },

        watch: {
            js: {
                files: ['src/**/*.js'],
                tasks: ['js'],
                options: {
                    spawn: false,
                    interrupt: true
                }
            },
            css: {
                files: ['src/**/*.less'],
                tasks: ['css'],
                options: {
                    spawn: false,
                    interrupt: true
                }
            }
        },

        gruntHtml: {
            layout: {
                src: ['tests/html/*.html', '!tests/html/layout.html'],
                dest: 'build/tests/',
                options: {
                    data: {
                        get specs() {
                            return getSpecs();
                        }
                    }
                }
            }
        },

        'mocha-phantomjs': {
            options: {
                view: '1024x768'
            },
            all: ['build/tests/*.html']
        },
    });

    grunt.loadTasks('tasks');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-csso');
    grunt.loadNpmTasks('grunt-contrib-connect');
    grunt.loadNpmTasks('grunt-contrib-watch');

    // Tasks
    grunt.registerTask('js', ['jshint', 'concat:js', 'uglify']);
    grunt.registerTask('css', ['less', 'csso']);
    grunt.registerTask('default', ['clean', 'js', 'css']);
    grunt.registerTask('dev', ['default', 'connect', 'watch']);

    grunt.registerTask('test', ['gruntHtml', 'mocha-phantomjs']);
};