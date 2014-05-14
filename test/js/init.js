(function() {

    var fields = [{
            label: 'Initialization by',
            field: 'init',
            values: ['object', 'DOM']
        }, {
            label: 'Thumbs',
            field: 'showThumbs',
            values: ['thumbs', 'dots', null]
        }, {
            label: 'Initialize handlers for single slide',
            field: 'single',
            values: false
        }, {
            label: 'Initialize handlers for keyboard',
            field: 'keyboard',
            values: true
        }],
        html = '';

    for (var i = 0; i < fields.length; i++) {
        html += getTemplate(fields[i]);
    }

    $('#options').html(html);

    $('#options .field__radio, #options .field__checkbox').on('change', function(e) {
        var params = {},
            byObject = false;

        // console.log(this.value);
        setTimeout(function() {
            for (var i = 0; i < fields.length; i++) {
                var value;

                // special method for initialization
                if (fields[i].field == 'init') {

                    byObject = $('.field__radio[name=init]:checked')[0].value == 'object';

                } else {

                    if (fields[i].values.length) {
                        value = $('.field__radio[name=' + fields[i].field + ']:checked').val();
                        if (value == "null") {
                            value = null;
                        }
                    } else {
                        value = $('.field__checkbox[name=' + fields[i].field + ']')[0].checked;
                    }

                    params[fields[i].field] = value;
                }
            }

            initPhotor($.extend(params, {}), byObject);
        }, 1);

    });

    initPhotor();

})();

function getTemplate(field) {
    var out = '<div class="field' + (field.values.length ? ' _switcher' : '') + '">';

    if (field.values.length) {
        out += '\n<span class="field__title">' + field.label + '</span>';

        out += '<div class="field__switcher">';

        for (var i = 0; i < field.values.length; i++) {
            out += '<input type="radio" class="field__radio" id="' + field.field + '-' + field.values[i] + '" name="' + field.field + '" value="' + field.values[i] + '"' + (i == 0 ? ' checked>' : '>');
            out += '<label for="' + field.field + '-' + field.values[i] + '" class="field__label">' + field.values[i] + '</label>';
        }

        out += '</div>';

    } else {
        out += '\n<input type="checkbox" class="field__checkbox" id="' + field.field + '" name="' + field.field + '"' + (field.values ? ' checked>' : '>');
        out += '\n<label for="' + field.field + '" class="field__label">' + field.label + '</label>';
    }

    return out + '</div>';
}

function initPhotor(params, byObject) {
    params = params || {};

    var images = '';

    for (var i = 1; i < 10; i++) {
        images += '<img src="../demo/images/' + i + '.jpg" data-thumb="../demo/thumbs/' + i + '.jpg">';
    }

    $('.photor')
        .attr('data-photor-id', '')
        .removeClass('_dots')
        .removeClass('_thumbs');
    $('.photor__viewportLayer').html(images);
    $('.photor__thumbsWrap').html();

    console.log(params, byObject);
    $('.photor').photor('destroy');
    $('.photor').photor(params);
}
