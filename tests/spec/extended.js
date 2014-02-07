describe('Только с основными параметрами', function() {
    before(function() {
        $('.photor').photor(defaultParams);
    });

    // Инициализация
    common();

    it('Инициализация прошла успешно: каждой галерее выставлен аттрибут data-photor-id', function() {
        var galleryId = $('.photor').attr('data-photor-id');

        assert(galleryId != '');
        assert(galleryId == $('.photor')[0].id || '0');
    });

    it('Слайды созданы', function() {
        var slides = $('.' + defaultParams.slide).length;

        assert(slides);
    });

    it('Осуществлен переход к текущему слайду', function() {
        var slides = $('.' + defaultParams.slide).length;

        assert(slides);
    });

    // Id c именем

    after(function() {
        // dispose
    });
});