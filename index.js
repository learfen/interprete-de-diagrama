
        let eventsCreated = false
        let codeExcel ;
        fetch('./codeExcel.js')
        .then( async text => await text.text() )
        .then( text => codeExcel = text )
        // document.querySelector('#codeExcel').innerText
        function decodeDiagram(inputStr) {
            var textarea = document.createElement("textarea");
            textarea.innerHTML = inputStr;
            return textarea.value;
        }
    
        function evalStage( str , stage , code ){
            if(str.split(' ').length === 1){
                let findProccess = document.querySelector('[value='+str+'][style*=ellipse]')
                if( findProccess ) {
                    str = execute( findProccess )
                    return str + ';\n'
                }
            }
            let words = {
              'indice':'indexOf',
              'agregar':'push',
              'borrar':'splice',
              'reemplazar':'splice',
            }
            for( let method in words ){
              str = str.replace(`.${method}(`,`.${words[method]}(`)
            }
            // imprimir
            if(str.split(' ')[0].toLowerCase() == 'imprimir'){
                let strArray = str.split(' ')
                strArray[0] = strArray[0].toLowerCase()
                str = strArray.join(' ')
                return `document.querySelector('#printer-output').innerHTML += '<hr>'+ (typeof ${str.replace('imprimir','')} == 'string' ? ${str.replace('imprimir','').toString()} : JSON.stringify(${str.replace('imprimir','')}) );\n`
            }
            // graficar
            if(str.split(' ')[0].toLowerCase() == 'graficar'){
                let strArray = str.split(' ')
                strArray[0] = strArray[0].toLowerCase()
                str = strArray.join(' ')
                return `document.querySelector('#printer-output').appendChild( renderTable(${str.replace('graficar','')}) );`
            }
            // arrays {
            if(stage.getAttribute('style').search('swimlane') > -1){
                let items = Array.from(document.querySelectorAll('mxCell[parent='+stage.id+']')).map( item => item.getAttribute('value') )
                console.log( stage.getAttribute('value') + ' = ['+items.join(',') + '];' )
                return stage.getAttribute('value') + ' = ['+items.join(',') + '];\n'
            }
            // if
            if(stage.getAttribute('style').search('rhombus') > -1){
                console.log(' eval if ')
                let result = 'x'
                //str = eval(code + `result = ( ${str.replace('Si','').split(' y ').join('&&').split(' o ').join('&&')} )`)
                // return result + ';\n'
                return `if( ${str.replace('Si','').replace('si','').split(' y ').join('&&').split(' o ').join('||')} )`
            }
            // declaracion de variable
            if( str.toLowerCase().split('var')[0] === '' ){
                let varCut = str.split('=')
                if( varCut.length > 1 ){ 
                  if(varCut[1].split(' ').join('')[0] == '#' ){
                    console.log(varCut[1].split(' ').join(''))
                    return `${varCut[0]} = document.querySelector('${varCut[1].split(' ').join('')}').type == 'number' ? +(document.querySelector('${varCut[1].split(' ').join('')}').value) : document.querySelector('${varCut[1].split(' ').join('')}').value;\n`
                  }
                  //return str +'=`'+ prompt('Ingrese '+stage.getAttribute('value').split(' ') ) + '`;'
                }
                return str + ';\n'
            }
            
            return str + ';\n'
        }
    
        function getNextArrow( actualStage , define ){
            if( define !== null ){
                let arrows = Array.from( document.querySelectorAll('[source='+actualStage.id+']') )
                let result = define ? arrows.filter( arrow => arrow.getAttribute('value') == 'Si' )[0] : arrows.filter( arrow => arrow.getAttribute('value') == 'No' )[0]
                return result 
            }
            return document.querySelector('[source='+actualStage.id+']')
        }
    
        function getNextStage( arrow , code ){
            let stage1 = document.querySelector('#'+arrow.getAttribute('target'))
            let stage1Text = decodeDiagram(stage1.getAttribute('value'))
            let defineArrow = null
            if(stage1Text){
                if( stage1Text.toLowerCase().search('fin') == 0 ) {
                    return `${code} return ${stage1Text.replace('fin','').replace('Fin','') || 'true'} ;\n`
                }
                let resultStage = evalStage( stage1Text , stage1 , code )
                if( typeof resultStage == 'string' )
                    code += resultStage
                else defineArrow = resultStage
            }
            
            let nextArrow = getNextArrow( stage1 , defineArrow )
            if( nextArrow ) return getNextStage( nextArrow , code )
            return code
        }
    
        function evalExe(){
            document.querySelector('#printer-output').innerHTML = ''
            document.querySelector('#diagramAsHtml').innerHTML = ''
            let div = document.createElement('div')
            div.innerHTML = document.querySelector('#data').value
            document.querySelector('#diagramAsHtml').appendChild(div)
            execute()
        }
        function evalEvents(){
            let events = document.querySelectorAll('[style*=umlActor]')
            let nodes = Array.from(document.querySelectorAll('[source]'))
            for( let event of events){
                let eventText = event.getAttribute('value').toLowerCase()
                let tagHtmL = null
                let method = null
                for(let nodeTarget of nodes){
                    if(nodeTarget.getAttribute('source') == event.id){
                        tagHtmL = document.getElementById( nodeTarget.getAttribute('target') )
                    }
                }
                for(let nodeTarget of nodes){
                    if(nodeTarget.getAttribute('source') == tagHtmL.id)
                        method = document.getElementById(  nodeTarget.getAttribute('target') )
                }
                document.querySelector( tagHtmL.getAttribute('value') ).addEventListener(eventText, event => {
                    setTimeout(()=>{
                        execute()
                        if(window[method.getAttribute('value')]) window[method.getAttribute('value')](event) 
                    },2000)
                })
            }
        }
        function evalGui( stage ){
          let interpreteInputs = {
              'texto':{node:'input'},
              'numero':{node:'input', type:'number'},
              'fecha':{node:'input', type:'date'},
              'hora':{node:'input', type:'time'},
              'boton':{node:'button'},
              'excel':{node:'input', type:'file',name:'excel'},
            }
            let inputs = document.querySelectorAll('[style*=manualInput]')
            console.log(inputs)
            for( input of inputs){
                let defineNode = input.getAttribute('value').split(' ')[0]
                let text = input.getAttribute('value').replace(defineNode+' ','')
                let [nodeName , nodeId] = defineNode.split('#')
                let findNode = document.querySelector('#'+nodeId)
                console.log( defineNode , nodeName , nodeId )
                if(!findNode){
                    let node = document.createElement(interpreteInputs[nodeName].node)
                    node.id = nodeId
                    if(interpreteInputs[nodeName].type) {
                        node.type = interpreteInputs[nodeName].type
                    }
                    if(interpreteInputs[nodeName].name) node.name = interpreteInputs[nodeName].name
                    if(interpreteInputs[nodeName].node == 'button'){
                      node.innerText = text
                      node.className = 'btn btn-primary btn-sm'
                      document.querySelector('#gui').appendChild(node)
                    }else{
                      node.className = 'form-control'
                      let label = document.createElement('label')
                      label.innerText = text
                      label.appendChild(node)
                      label.className = 'form-control-label p-1'
                      document.querySelector('#gui').appendChild(label)
                    }
                }else{
                    if(interpreteInputs[nodeName].node == 'button'){
                      if(findNode.innerText != text) findNode.innerText = text
                    }else{
                      if(findNode.parentNode.innerText != text) findNode.parentNode.innerText = text
                    }
                  
                }
            }
        }
        let script = document.createElement('script')
        function execute( $inicio ){
            document.querySelector('#resultJS').innerHTML = ''
            evalGui()
            let inicios = [...Array.from(document.querySelectorAll('[value*=inicio]')) , ...Array.from(document.querySelectorAll('[value*=Inicio]') ) ]
            const getCode = (inicio , type) => {
                let arrow1 = document.querySelector('[source='+inicio.id+']')
                // si style = rhombus
                let code = getNextStage( arrow1 , '')
                if( type == 'block' ) return `{ \n${code} }` 
                let functionName = inicio.getAttribute('value').replace('inicio','').replace('Inicio','').replace(' ','')
                let codeResult = functionName.split('(').length > 1 ? `\n\nfunction ${functionName}{` : `\n\nfunction ${functionName}(){`
                codeResult +=`
                    ${code.split('<hr>').join('')}
                }`
                let params = []
                if(functionName.split(')').length > 1){
                    let paramsString = functionName.split('').pop().split('(')[1]
                    eval(`params = [${paramsString}]`)
                    params.unshift('event')
                }
                document.querySelector('#resultJS').innerHTML += codeResult
                script.innerHTML += `var ${functionName.split('(')[0]} = function ( ${functionName.split('(')[1].split(')')[0]} ){ ${ code } };`
                let buttonCallFunction = 'button-function-'+functionName
                if( !document.querySelector('#'+buttonCallFunction.split('(')[0]) ){
                    let button = document.createElement('button')
                    button.id = buttonCallFunction
                    button.innerHTML = functionName
                    button.className = 'btn btn-primary btn-sm'
                    button.addEventListener('click' , event => {
                        execute()
                        if(functionName.split(')').length > 1){
                            let paramsString = functionName.split('').pop().split('(')[1]
                            let params = []
                            eval(`params = [${paramsString}]`)
                            params.unshift(event)
                            window[functionName.split('(')[0]](...params)
                        }else{
                            window[functionName.split('(')[0]](event)
                        }
                    })
                    document.querySelector('#functions').appendChild(button)
                }
            }
            if( $inicio ) return getCode( $inicio , 'block')
            for(let inicio of inicios){
                getCode(inicio , 'function')
            }
            script.innerHTML += codeExcel
            document.querySelector('body').appendChild(script)
            if( !eventsCreated ) {
              eventsCreated = true
              setTimeout(()=> evalEvents() , 1000 )
            }
              
            // console.log( inicio.getAttribute('value').replace('inicio','').replace(' ','') )
        }
    
        document.querySelector('#evalExe').addEventListener('click', ()=>{
          document.querySelector('#printer-output').innerHTML = ''
          document.querySelector('#diagramAsHtml').innerHTML = ''
          document.querySelector('#functions').innerHTML = ''
          document.querySelector('#gui').innerHTML = ''
          document.querySelector('#resultJS').innerHTML = ''
          document.querySelector('#form').classList.add('d-none')
          document.querySelector('#resultRenderized').classList.remove('d-none')
          evalExe()
        })
    
    
        function copyToClipBoard (id_elemento) {
          var aux = document.createElement("input");
          aux.setAttribute("value", document.getElementById(id_elemento).value);
          document.body.appendChild(aux);
          aux.select();
          document.execCommand("copy");
          document.body.removeChild(aux);
          alert('Copiado al portapapeles')
        }
        
        // excel ================================================================
