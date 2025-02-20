
import { StateManager } from './ui/StateManager'
import { DOMFragment } from './ui/DOMFragment';

export class EventRouter{
    constructor(){
        this.device = null
        this.state = new StateManager()
        this.routes = {}
        this.managers = null

        this.id = String(Math.floor(Math.random()*1000000))
    }

    init(device){
        this.device = device
        if (this.device.states){
        Object.keys(this.device.states).forEach(key => {
                let states = this.device.states[key]
                if (states != null){
                    if (!Array.isArray(states)) states = [states]
                    states.forEach((state,i) => {

                        // Add to Event State
                        let splitId = state.meta.id.split('_')

                        // Create display label
                        let labelArr = splitId.map(str => str[0].toUpperCase() + str.slice(1))
                        state.meta.label = labelArr.join(' ')
                        
                        this.state.addToState(state.meta.id, state)
                        this.routes[state.meta.id] = [state, null]

                        // Route Switches in Atlas by Default
                        if (!(splitId[0] in this.device.atlas.data.states)) this.device.atlas.data.states[splitId[0]] = {}
                        if (splitId.length > 1) splitId.push('default')
                        if (!(splitId[1] in this.device.atlas.data.states[splitId[0]])) this.device.atlas.data.states[splitId[0]][splitId[1]] = [state]
                        else this.device.atlas.data.states[splitId[0]][splitId[1]].push([state])

                        // Declare Callback and Subscribe
                        let deviceCallback = (o) => {
                            this.update(o, this.routes[state.meta.id])
                        }

                        this.state.subscribe(state.meta.id, deviceCallback)
                    })
                }
        })
    }
    }

    deinit = () => {
        if (this.ui) this.ui.deleteNode()
    }

    // Route Events to Atlas
    update(o,targets=[]) {
        let newState = o.data

        targets.forEach(t => {
            if ('data' in t) {
                t.data = newState
            }
            else if ('data' in t[0]){
                t[0].data = newState
            }
            else if ('data' in t[0].data[0]) {
                t[0].data[0] = newState
            }
        })
    }

    // assign(state,){

    // }


    autoRoute = (stateManagerArray) => {
        let validRoutes = this.getValidRoutes(stateManagerArray)
        let eventsToBind = Object.keys(this.routes)

        // Remove Invalid Events
        eventsToBind = eventsToBind.filter(id => !(id.split('_')[1] == 0 && Object.keys(this.routes).find(str => str.split('_')[0] === id.split('_')[0]) != null))

        // Remove Events Already Selected
        // for (let id in this.routes){
        //     eventsToBind = eventsToBind.filter(id => !(id.split('_')[1] == 0 && Object.keys(this.routes).find(str => str.split('_')[0] === id.split('_')[0]) != null))
        // }

        validRoutes.forEach(newRoute => {

            if (eventsToBind.length > 0){
                let id = eventsToBind.shift()
                let routes = this.routes[id]
                
                let target = newRoute.manager.data[newRoute.key]
                routes[1] = target

                let routeSelector = document.getElementById(`${this.id}brainsatplay-router-selector-${id}`)
                if (routeSelector != null) {
                    var opts = routeSelector.options;
                    for (var opt, j = 0; opt = opts[j]; j++) {
                        if (opt.value == newRoute.key) {
                            routeSelector.selectedIndex = j;
                        break;
                        }
                    }
                }
            }
        })
    }

    getValidRoutes = (stateManagerArray) => {
        let validRoutes = []

        stateManagerArray.forEach(manager => {
            let keys = Object.keys(manager.data)

            let notArrayOrObject = (input) => {
                try{
                    return (input.constructor != Object && !Array.isArray(input))
                } catch{return false}
            }
            keys = keys.filter(k => {
                let state = manager.data[k]
                // Guess if State is Binary or Continuous
                if (notArrayOrObject(state?.data) || (Array.isArray(state) && notArrayOrObject(state[0]?.data)) || (Array.isArray(state?.data) && notArrayOrObject(state?.data[0].data))){
                    return k
                }
            })
            keys.forEach((key) => {
                validRoutes.push({key,manager})
            })
        })
        return validRoutes
    }

    addControls = (stateManagerArray=this.managers, parentNode=document.body) => {
        
        this.managers = stateManagerArray

        let template = () => {
            return `
            <br>
            <div id='${this.id}routerControls' style="padding: 10px;">
                <div style="display: grid; grid-template-columns: repeat(2,1fr); align-items: center;">
                    <h4>Control Panel</h4>
                    <button class="brainsatplay-default-button" style="flex-wrap: wrap;">
                    <p style="margin-bottom: 0;">Update Available Events<p>
                    <p style="font-size: 70%; margin-top: 0;">(e.g. when you switch games)</p>
                    </button>
                </div>
                <hr>
                <div class='brainsatplay-router-options' style="display: flex; flex-wrap: wrap;">
                </div>
            </div>
            `;
        }

        let update = () => {
            let routerOptions = document.getElementById(`${this.id}routerControls`).querySelector('.brainsatplay-router-options')
            routerOptions.innerHTML = ''
            
            let validRoutes = this.getValidRoutes(stateManagerArray)

            let managerMap = {}
            let selector = document.createElement('select')
            selector.insertAdjacentHTML('beforeend',`
            <option value="" disabled selected>Choose an event</option>
            <option value="none">None</option>
            `)
            validRoutes.forEach(dict => {
                managerMap[dict.key] = dict.manager

                let splitId = dict.key.split('_')
                splitId = splitId.map(s => s[0].toUpperCase() + s.slice(1))

                let upper = splitId.join(' ')
                selector.insertAdjacentHTML('beforeend',`<option value="${dict.key}">${upper}</option>`)           
            })

            Object.keys(this.state.data).forEach(id => {
                if (!['update'].includes(id)){
                    let thisSelector = selector.cloneNode(true)

                    thisSelector.id = `${this.id}brainsatplay-router-selector-${id}`

                    thisSelector.onchange = (e) => {
                        try {
                            let target = managerMap[thisSelector.value].data[thisSelector.value]

                            // Switch Route Target
                            if (this.routes[id].length < 2) this.routes[id].push(target)
                            else this.routes[id][1] = target

                        } catch (e) {}
                    }

                    let div = document.createElement('div')
                    div.style.padding = '10px'
                    div.insertAdjacentHTML('beforeend', `<p style="font-size: 80%;">${this.state.data[id].meta.label}</p>`)
                    div.insertAdjacentElement('beforeend', thisSelector)
                    routerOptions.insertAdjacentElement('beforeend',div)
                }
            })
            
            this.autoRoute(stateManagerArray)
        }

        let setup = () => {
            let updateButton = document.getElementById(`${this.id}routerControls`).querySelector('button')
            updateButton.style.display = 'none'
           updateButton.onclick = () => {
               update()
            // this.updateRouteDisplay(stateManagerArray)
           }
           update()
            // this.updateRouteDisplay(stateManagerArray)
        }

        this.ui = new DOMFragment(
            template,
            parentNode,
            undefined,
            setup
        )
    }

    updateRouteDisplay(stateManagerArray=this.managers, autoroute=true){

            let routerOptions = document.getElementById(`${this.id}routerControls`).querySelector('.brainsatplay-router-options')
            routerOptions.innerHTML = ''
            
            let validRoutes = this.getValidRoutes(stateManagerArray)
            let managerMap = {}
            let selector = document.createElement('select')
            selector.insertAdjacentHTML('beforeend',`
            <option value="" disabled selected>Choose an event</option>
            <option value="none">None</option>
            `)
            validRoutes.forEach(dict => {
                managerMap[dict.key] = dict.manager

                let splitId = dict.key.split('_')
                splitId = splitId.map(s => s[0].toUpperCase() + s.slice(1))

                let upper = splitId.join(' ')
                selector.insertAdjacentHTML('beforeend',`<option value="${dict.key}">${upper}</option>`)           
            })

            Object.keys(this.state.data).forEach(id => {
                if (!['update'].includes(id)){
                    let thisSelector = selector.cloneNode(true)

                    thisSelector.id = `${this.id}brainsatplay-router-selector-${id}`

                    thisSelector.onchange = (e) => {
                        try {
                            let target = managerMap[thisSelector.value].data[thisSelector.value]

                            // Switch Route Target
                            if (this.routes[id].length < 2) this.routes[id].push(target)
                            else this.routes[id][1] = target

                        } catch (e) {}
                    }

                    let div = document.createElement('div')
                    div.style.padding = '10px'
                    div.insertAdjacentHTML('beforeend', `<p style="font-size: 80%;">${this.state.data[id].meta.label}</p>`)
                    div.insertAdjacentElement('beforeend', thisSelector)
                    routerOptions.insertAdjacentElement('beforeend',div)
                }
            })
        
        if (autoroute){
            this.autoRoute(stateManagerArray)
        }
    }
}