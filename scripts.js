var log = function(val, base) {
    return Math.log(val) / Math.log(base);
};

var strToClass = function(str){
    var className = "";
    str = str.toLowerCase();
    var validChars = 'abcdefghijklmnopqrstuvwxyz';
    var newWord = false;
    for(var i = 0; i < str.length; i++) {
        var chr = str[i];
        if(validChars.indexOf(chr) >= 0) {
            if(newWord) chr = chr.toUpperCase();
            className += chr;
            newWord = false;
        }
        else {
            newWord = true;
        }
    }
    return className;
};

var addCssRule = function(selector, rules){
    var sheet = document.styleSheets[0];
    if("insertRule" in sheet) {
        sheet.insertRule(selector + "{" + rules + "}", 0);
    }
    else if("addRule" in sheet) {
        sheet.addRule(selector, rules, 0);
    }
};

var kinks = {};
var inputKinks = {}
var colors = {}
var level = {};

$(function(){
    var imgbbClientId = 'acabd735998bd2e500b0f72bb4907d58';
    
    inputKinks = {
        $columns: [],
        createCategory: function(name, fields){
            var $category = $('<div class="kinkCategory">')
                    .addClass('cat-' + strToClass(name))
                    .data('category', name)
                    .append($('<h2>')
                    .text(name));
            
            var $table = $('<table class="kinkGroup">').data('fields', fields);
            var $thead = $('<thead>').appendTo($table);
            for(var i = 0; i < fields.length; i++) {
                $('<th>').addClass('choicesCol').text(fields[i]).appendTo($thead);
            }
            $('<th>').appendTo($thead);
            $('<tbody>').appendTo($table);
            $category.append($table);
            
            return $category;
        },
        createChoice: function(){
            var $container = $('<div>').addClass('choices');
            var levels = Object.keys(level);
            for(var i = 0; i < levels.length; i++) {
                $('<button>')
                        .addClass('choice')
                        .addClass(level[levels[i]])
                        .data('level', levels[i])
                        .data('levelInt', i)
                        .attr('title', levels[i])
                        .appendTo($container)
                        .on('click', function(){
                            $container.find('button').removeClass('selected');
                            $(this).addClass('selected');
                            inputKinks.saveState();
                            inputKinks.updateShareURL();
                        });
            }
            return $container;
        },
        createKink: function(fields, kink){
            var $row = $('<tr>').data('kink', kink.kinkName).addClass('kinkRow');
            for(var i = 0; i < fields.length; i++) {
                var $choices = inputKinks.createChoice();
                $choices.data('field', fields[i]);
                $choices.addClass('choice-' + strToClass(fields[i]));
                $('<td>').append($choices).appendTo($row);
            }
            var kinkLabel = $('<td>').text(kink.kinkName).appendTo($row);
            if(kink.kinkDesc) {showDescriptionButton(kink.kinkDesc, kinkLabel);}
            $row.addClass('kink-' + strToClass(kink.kinkName));
            return $row;
        },
        createColumns: function(){
            var colClasses = ['100', '50', '33', '25'];
            
            var numCols = Math.floor((document.body.scrollWidth - 20) / 400);
            if(!numCols) numCols = 1;
            if(numCols > 4) numCols = 4;
            var colClass = 'col' + colClasses[numCols - 1];
            
            inputKinks.$columns = [];
            for(var i = 0; i < numCols; i++){
                inputKinks.$columns.push($('<div>').addClass('col ' + colClass).appendTo($('#InputList')));
            }
        },
        placeCategories: function($categories){
            var $body = $('body');
            var totalHeight = 0;
            for(var i = 0; i < $categories.length; i++) {
                var $clone = $categories[i].clone().appendTo($body);
                var height = $clone.height();;
                totalHeight += height;
                $clone.remove();
            }
            
            var colHeight = totalHeight / (inputKinks.$columns.length);
            var colIndex = 0;
            for(var i = 0; i < $categories.length; i++) {
                var curHeight = inputKinks.$columns[colIndex].height();
                var catHeight = $categories[i].height();
                if(curHeight + (catHeight / 2) > colHeight) colIndex++;
                while(colIndex >= inputKinks.$columns.length) {
                    colIndex--;
                }
                inputKinks.$columns[colIndex].append($categories[i]);
            }
        },
        fillInputList: function(){
            $('#InputList').empty();
            inputKinks.createColumns();
            
            var $categories = [];
            var kinkCats = Object.keys(kinks);
            for(var i = 0; i < kinkCats.length; i++) {
                var catName = kinkCats[i];
                var category = kinks[catName];
                var fields = category.fields;
                var kinkArr = category.kinks;
                
                var $category = inputKinks.createCategory(catName, fields);
                var $tbody = $category.find('tbody');

                for(var k = 0; k < kinkArr.length; k++) {
                    $tbody.append(inputKinks.createKink(fields, kinkArr[k]));
                }
                
                $categories.push($category);
            }
            inputKinks.placeCategories($categories);
            inputKinks.loadState();
        },
        init: function(){
            // Set up DOM
            inputKinks.fillInputList();

            // Make export button work
            $('#ExportButtonOKClaro').on('click', function() {
                inputKinks.export(true);
            });

            $('#ExportButtonOKEscuro').on('click', function() {
                inputKinks.export(false);
            });
            $('#URL').on('click', function(){ this.select(); });

        },
        //Desenha a legenda
        drawLegend: function(context, temaClaro){
            context.font = "bold 13px Arial";
            
            var levels = Object.keys(colors);
            var x = context.canvas.width - 15 - (120 * levels.length);
            for(var i = 0; i < levels.length; i++) {
                context.beginPath();
                context.arc(x + (120 * i), 17, 8, 0, 2 * Math.PI, false);
                context.fillStyle = colors[levels[i]];
                context.fill();
                context.strokeStyle = 'rgba(0, 0, 0, 0.5)'
                context.lineWidth = 1;
                context.stroke();

                context.fillStyle = temaClaro ? '#000000ff' : '#FFFFFFff' //Cor do título das legendas do topo
                context.fillText(levels[i], x + 15 + (i * 120), 22);
            }
        },
        //Prepara a imagem
        setupCanvas: function(width, height, username,temaClaro){
            $('canvas').remove();
            var canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            
            var $canvas = $(canvas);
            $canvas.css({
                width: width,
                height: height
            });
            
            //Fundo
            var context = canvas.getContext('2d');
            context.fillStyle = temaClaro ? '#FFFFFFff' : '#000000ff'; //Cor do fundo
            context.fillRect(0, 0, canvas.width, canvas.height);
            
            //Titulo Principal (KinkListBR)
            context.font = "bold 24px Arial";
            context.fillStyle = temaClaro ? '#000000ff' : '#FFFFFFff'; //Cor do título principal a esquerda acima
            context.fillText('KinkListBR ' + username, 5, 25);
            
            //Desenha a legenda do topo
            inputKinks.drawLegend(context, temaClaro);
            return { context: context, canvas: canvas };
        },
        drawCallHandlers: {
            //Titulo simples
            simpleTitle: function(context, drawCall, temaClaro){
                context.fillStyle = temaClaro ? '#000000ff' : '#FFFFFFff'; //Cor do título se ele não tiver subtitulo
                context.font = "bold 18px Arial";
                context.fillText(drawCall.data, drawCall.x, drawCall.y + 5);
            },
            //Titulo com subtitulo
            titleSubtitle: function(context, drawCall, temaClaro){
                context.fillStyle = temaClaro ? '#000000ff' : '#FFFFFFff'; //Cor do titulo caso tenha subtitulo (Dar,Receber)
                context.font = "bold 18px Arial";
                context.fillText(drawCall.data.category, drawCall.x, drawCall.y + 5);
                
                var fieldsStr = drawCall.data.fields.join(', ');
                context.font = "italic 12px Arial";
                context.fillText(fieldsStr, drawCall.x, drawCall.y + 20);
            },
            //Titulo do fetiche
            kinkRow: function(context, drawCall, temaClaro){
                context.fillStyle = temaClaro ? '#000000ff' : '#FFFFFFff'; //Cor do nome do fetiche
                context.font = "12px Arial";
                
                var x = drawCall.x + 5 + (drawCall.data.choices.length * 20);
                var y = drawCall.y - 6;
                context.fillText(drawCall.data.text, x, y);
                
                // Circles
                for(var i = 0; i < drawCall.data.choices.length; i++){
                    var choice = drawCall.data.choices[i];
                    var color = colors[choice];
                    
                    var x = 10 + drawCall.x + (i * 20);
                    var y = drawCall.y - 10;
                    
                    context.beginPath();
                    context.arc(x, y, 8, 0, 2 * Math.PI, false);
                    context.fillStyle = color;
                    context.fill();
                    context.strokeStyle = 'rgba(0, 0, 0, 0.5)'
                    context.lineWidth = 1;
                    context.stroke();
                }
                
            }
        },
        export: async function(temaClaro){
            var username = prompt("Digite o seu apelido:");
            if(typeof username !== 'string') return;
            else if (username.length ) username = '(' + username + ')';
            
            $('#URL').fadeOut();
            
            // Constants
            var numCols = 6;
            var columnWidth = 250;
            var simpleTitleHeight = 35;
            var titleSubtitleHeight = 50;
            var rowHeight = 25;
            var offsets = {
                left: 10,
                right: 10,
                top: 50,
                bottom: 10
            };
            
            // Find out how many we have of everything
            var numCats = $('.kinkCategory').length;
            var dualCats = $('.kinkCategory th + th + th').length;
            var simpleCats = numCats - dualCats;
            var numKinks = $('.kinkRow').length;
            
            // Determine the height required for all categories and kinks
            var totalHeight = (
                    (numKinks * rowHeight) +
                    (dualCats * titleSubtitleHeight) +
                    (simpleCats * simpleTitleHeight)
            );
            
            // Initialize columns and drawStacks
            var columns = [];
            for(var i = 0; i < numCols; i++){
                columns.push({ height: 0, drawStack: []});
            }
            
            // Create drawcalls and place them in the drawStack
            // for the appropriate column
            var avgColHeight = totalHeight / numCols;
            var columnIndex = 0;
            $('.kinkCategory').each(function(){
                var $cat = $(this);
                var catName = $cat.data('category');
                var category = kinks[catName];
                var fields = category.fields;
                var catKinks = category.kinks;
                
                var catHeight = 0;
                catHeight += (fields.length === 1) ? simpleTitleHeight : titleSubtitleHeight;
                catHeight += (catKinks.length * rowHeight);
                
                // Determine which column to place this category in
                if((columns[columnIndex].height + (catHeight / 2)) > avgColHeight) columnIndex++;
                while(columnIndex >= numCols) columnIndex--;
                var column = columns[columnIndex];
                
                // Drawcall for title
                var drawCall = { y: column.height };
                column.drawStack.push(drawCall);
                if(fields.length < 2) {
                    column.height += simpleTitleHeight;
                    drawCall.type =  'simpleTitle';
                    drawCall.data = catName;
                }
                else {
                    column.height += titleSubtitleHeight;
                    drawCall.type =  'titleSubtitle';
                    drawCall.data = {
                        category: catName,
                        fields: fields
                    };
                }
                
                // Drawcalls for kinks
                $cat.find('.kinkRow').each(function(){
                    var $kinkRow = $(this);
                    var drawCall = { y: column.height, type: 'kinkRow', data: {
                            choices: [],
                            text: $kinkRow.data('kink')
                    }};
                    column.drawStack.push(drawCall);
                    column.height += rowHeight;
                    
                    // Add choices
                    $kinkRow.find('.choices').each(function(){
                        var $selection = $(this).find('.choice.selected');
                        var selection = ($selection.length > 0)
                                ? $selection.data('level')
                                : Object.keys(level)[0];
                        
                        drawCall.data.choices.push(selection);
                    });
                });
            });
            
            var tallestColumnHeight = 0;
            for(var i = 0; i < columns.length; i++){
                if(tallestColumnHeight < columns[i].height) {
                    tallestColumnHeight = columns[i].height;
                }
            }
            
            var canvasWidth = offsets.left + offsets.right + (columnWidth * numCols);
            var canvasHeight = offsets.top + offsets.bottom + tallestColumnHeight;
            var setup = inputKinks.setupCanvas(canvasWidth, canvasHeight, username, temaClaro);
            var context = setup.context;
            var canvas = setup.canvas;
            
            for(var i = 0; i < columns.length; i++) {
                var column = columns[i];
                var drawStack = column.drawStack;
                
                var drawX = offsets.left + (columnWidth * i);
                for(var j = 0; j < drawStack.length; j++){
                    var drawCall = drawStack[j];
                    drawCall.x = drawX;
                    drawCall.y += offsets.top;
                    inputKinks.drawCallHandlers[drawCall.type](context, drawCall, temaClaro);
                }
            }

            const url = `https://api.imgbb.com/1/upload?key=${imgbbClientId}`;

            const formData = new FormData();
            formData.append('image', canvas.toDataURL().split(',')[1]);

            try {
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (data.success) {
                    $('#URL').val(data.data.url).fadeIn();
                    window.open(data.data.url, '_blank').focus();    
                } else {
                    statusText.innerText = `Error: ${data.error.message}`;
                }

            } catch (error) {
                alert('Erro ao gerar a imagem, tente novamente.');
            }

        },
        saveState: function(){
            var state = {};
            $('tr.kinkRow').each(function(){
                var kinkName = $(this).data('kink');
                var catName = $(this).closest('.kinkCategory').data('category');
                $(this).find('.choices').each(function(){
                    var field = $(this).data('field');
                    var $selected = $(this).find('.choice.selected');
                    if($selected.length){
                        var key = catName + '|' + kinkName + '|' + field;
                        state[key] = $selected.data('level');
                    }
                });
            });
            localStorage.setItem('kinkListState', JSON.stringify(state));
        },
        loadState: function(){
            var raw = localStorage.getItem('kinkListState');
            if(!raw) return;
            var state;
            try { state = JSON.parse(raw); }
            catch(e){ return; }

            $('tr.kinkRow').each(function(){
                var kinkName = $(this).data('kink');
                var catName = $(this).closest('.kinkCategory').data('category');
                $(this).find('.choices').each(function(){
                    var field = $(this).data('field');
                    var key = catName + '|' + kinkName + '|' + field;
                    var level = state[key];
                    if(level === undefined) return;
                    $(this).find('.choice').removeClass('selected').each(function(){
                        if($(this).data('level') === level) $(this).addClass('selected');
                    });
                });
            });
        },
        inputListToText: function(){
            var KinksText = "";
            var kinkCats = Object.keys(kinks);
            for(var i = 0; i < kinkCats.length; i++){
                var catName = kinkCats[i];
                var catFields = kinks[catName].fields;
                var catKinks = kinks[catName].kinks;
                KinksText += '#' + catName + "\r\n";
                KinksText += '(' + catFields.join(', ') + ")\r\n";
                for(var j = 0; j < catKinks.length; j++){
                    KinksText += '* ' + catKinks[j].kinkName + "\r\n";
                    if(catKinks[j].kinkDesc) 
                        { KinksText += '? ' + catKinks[j].kinkDesc + "\r\n"; }
                }
                KinksText += "\r\n";
            }
            return KinksText;
        },
        //Lê o completa.md e converte para as listas
        parseKinksText: function(kinksText){
            var newKinks = {};
            var lines = kinksText.replace(/\r/g, '').split("\n");

            var cat = null;
            var catName = null;
            for(var i = 0; i < lines.length; i++){
                var line = lines[i];
                if(!line.length) continue;

                if(line[0] === '#') {
                    if(catName){
                        if(!(cat.fields instanceof Array) || cat.fields.length < 1){
                            alert(catName + ' does not have any fields defined!');
                            return;
                        }
                        if(!(cat.kinks instanceof Array) || cat.kinks.length < 1){
                            alert(catName + ' does not have any kinks listed!');
                            return;
                        }
                        newKinks[catName] = cat;
                    }
                    catName = line.substring(1).trim();
                    cat = { kinks: [] };
                }

                if(!catName) continue;

                if(line[0] === '(') {
                    cat.fields = line.substring(1, line.length - 1).trim().split(',');
                    for(var j = 0; j < cat.fields.length; j++){
                        cat.fields[j] = cat.fields[j].trim();
                    }
                }

                if(line[0] === '*'){
                    var kink = {};
                    kink.kinkName = line.substring(1).trim();
                    cat.kinks.push(kink);
                }

                if(line[0] === '?'){
                    kink.kinkDesc = line.substring(1).trim();
                }
            }
            if(catName && !newKinks[catName]){
                if(!(cat.fields instanceof Array) || cat.fields.length < 1){
                    alert(catName + ' does not have any fields defined!');
                    return;
                }
                if(!(cat.kinks instanceof Array) || cat.kinks.length < 1){
                    alert(catName + ' does not have any kinks listed!');
                    return;
                }
                newKinks[catName] = cat;
            }
            return newKinks;
        },
        stateToShareString: function(){
            var chars = [];
            $('tr.kinkRow').each(function(){
                $(this).find('.choices').each(function(){
                    var $selected = $(this).find('.choice.selected');
                    var levelInt = $selected.length ? $selected.data('levelInt') : -1;
                    chars.push((levelInt + 1).toString(36)); // '0' = not answered, '1'+ = level
                });
            });
            return chars.join('');
        },
        applyShareString: function(str){
            var i = 0;
            $('tr.kinkRow').each(function(){
                $(this).find('.choices').each(function(){
                    if(i >= str.length) return;
                    var val = parseInt(str[i], 36);
                    i++;
                    if(val > 0){
                        var levelInt = val - 1;
                        $(this).find('.choice').removeClass('selected').each(function(){
                            if($(this).data('levelInt') === levelInt) $(this).addClass('selected');
                        });
                    }
                });
            });
        },
        updateShareURL: function(){
            var stateStr = inputKinks.stateToShareString();
            var compressed = LZString.compressToEncodedURIComponent(stateStr);
            var hash = 'lista=' + (inputKinks.currentListSize || 'simples') + '&kinks=' + compressed;
            history.replaceState(null, '', '#' + hash);
        }
    };

    //Modal Edit
    $('#Edit').on('click', function(){
        var KinksText = inputKinks.inputListToText();
        $('#Kinks').val(KinksText.trim());
        $('#EditOverlay').fadeIn();
    });
    $('#FecharEditOverlay').on('click', function(){
        $('#EditOverlay').fadeOut();
    });

    $('#ExportButtonOKLink').on('click', function(){
        navigator.clipboard.writeText(location.href)
        $('#ExportButtonOKLink').text("Copiado")
    });

    $('#KinksOK').on('click', function(){
        try {
            var kinksText = $('#Kinks').val();
            kinks = inputKinks.parseKinksText(kinksText);
            inputKinks.fillInputList();
        }
        catch(e){
            alert('O texto não foi compreendido, por favor, reescreva seguindo o exemplo original em Markdown');
            return;
        }
        $('#EditOverlay').fadeOut();
    });
    $('.overlay > *').on('click', function(e){
        e.stopPropagation();
    });

    //Modal Welcome
    $('#WelcomeOverlayBackground').fadeIn();
    $('#WelcomeOverlay').fadeIn();

    $('.welcomeOverlay > *').on('click', function(e){
        e.stopPropagation();
    });

    $('#WelcomeOverlayBackground').on('click', function(){
        $('#WelcomeOverlayBackground').fadeOut();
    });

    //Modal Export
    $('#Export').on('click', function(){
        $('#ExportButtonOKLink').text("Copiar Link para exportar");
        $('#ExportOverlayBackground').fadeIn();
        $('#ExportOverlay').fadeIn();

    });

    $('#ExportOverlayBackground').on('click', function(){
        $(this).fadeOut();
    });

    //Description
    $('#DescriptionOverlay').on('click', function(){
        $(this).fadeOut();
    });

    $('#Description').on('click', function(){
        $('#DescriptionOverlay').fadeOut();
    });

    function showDescriptionButton(description, attachElement) {
        $('<Button />', 
            { "class": 'KinkDesc',  
                click: function() {
                                    $('#Description').text(description);
                                    $('#DescriptionOverlay').fadeIn();
                                } 
        }).appendTo(attachElement);
    }

    $('.legend .choice').each(function(){
        var $choice = $(this);
        var $parent = $choice.parent();
        var text = $parent.text().trim();
        var color = $choice.data('color');
        var cssClass = this.className.replace('choice ', '').trim();
        
        addCssRule('.choice.' + cssClass, 'background-color: ' + color + ';');
        colors[text] = color;
        level[text] = cssClass;
    });

    function loadList(size, shareState){
        var file = size === 'completa' ? 'Listas/completa.md' : 'Listas/simples.md';
        inputKinks.currentListSize = size;
        fetch(file)
            .then(function(res){ return res.text(); })
            .then(function(text){
                kinks = inputKinks.parseKinksText(text.trim());
                inputKinks.init();
                if(shareState){
                    inputKinks.applyShareString(shareState);
                } else {
                    inputKinks.loadState();
                }
            })
            .catch(function(e){ console.error(e); });
    }

    $('#buttonSimples').on('click', function(){ loadList('simples'); });
    $('#buttonCompleta').on('click', function(){ loadList('completa'); });

    // Initial load — check if this is a shared link
    var hashParams = new URLSearchParams(location.hash.substring(1));
    var sharedList = hashParams.get('lista');
    var sharedKinksRaw = hashParams.get('kinks');
    var sharedKinks = sharedKinksRaw ? LZString.decompressFromEncodedURIComponent(sharedKinksRaw) : null;

    if(sharedList && sharedKinks){
        loadList(sharedList, sharedKinks);
        $('#SizeButtonGroup').hide();
        $('#SizeButtonGroupLabel').hide();
    } else {
        loadList('simples');
    }

});