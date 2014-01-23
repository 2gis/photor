module.exports = function(grunt) {

    grunt.registerMultiTask('gruntHtml', 'Compile Grunt (Lo-Dash like) templates ', function() {
        var options = this.options(),
            layout = grunt.file.read('tests/html/layout.html');

        this.files.forEach(function(file) {
            file.src.forEach(function(filepath) {
                var filename = filepath.replace(/[\w \/]*\//g, ''); // Извлекаем имя файла из полного пути

                if (!grunt.file.exists(filepath)) {
                    grunt.log.warn('Template file "' + filepath + '" not found.');
                    return;
                }
                
                var src = grunt.file.read(filepath);

                options.data.html = src;

                var html = grunt.template.process(layout, options);
                var dest = file.dest + filename;

                grunt.file.write(dest, html);
                grunt.log.writeln('File ' + dest.cyan + ' created');
            });

        });

    });

};