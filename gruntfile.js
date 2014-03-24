'use strict';

module.exports = function(grunt) {

    grunt.initConfig({

        clean: {
            dist: ['dist/*']
        },

        concat: {
            js: {
                src: ['src/**/*.js'],
                dest: 'dist/photor.js'
            }
        },

        jshint: {
            options: {
                jshintrc: '.jshintrc'
            },
            files: ['src/**/*.js', 'gruntfile.js']
        },

        uglify: {
            regular: {
                files: {
                    'dist/photor.min.js': ['<%= concat.js.dest %>']
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
        }

    });

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

};