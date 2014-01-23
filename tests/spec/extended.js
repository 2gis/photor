describe('Только с основными параметрами', function() {
    before(function() {
        $('.photor').photor(defaultParams);
    });

    common();

    // it('Выставился data-атрибут', function() {
    //     assert(true);
    // });

    after(function() {
        // dispose
    });
});