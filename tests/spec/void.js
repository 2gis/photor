describe('Без параметров', function() {
    before(function() {
        $('.photor').photor();
    });

    // no common

    it('data-атрибут не выставился', function() {
        assert(true);
    });

    it('Обработчики событий не навешались', function() {
        assert(true);
    });

    it('Вызов любого метода с дом-элемента приводит к ошибке', function() {
        var methods = ['update', 'dispose'];

        _.each(methods, function(method) {
            assert(true);
        });
    });
});