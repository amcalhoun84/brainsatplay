class UI{

    static id = String(Math.floor(Math.random()*1000000))

    constructor(label, session, params={}) {

        // Generic Plugin Attributes
        this.label = label
        this.session = session
        this.params = {}

        // UI Identifier
        this.props = {
            id: String(Math.floor(Math.random()*1000000))
        }

        // Port Definition
        this.ports = {
            default: {
                defaults: {
                    input: [{username: 'Username', data: 'Value', meta: {label: 'Waiting for Data'}}]
                }
            }
        }
    }

    init = () => {

        let HTMLtemplate = () => {
            return `
            <div id='${this.props.id}' style='display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;'>
                <div style="width: 100%; padding: 0px 10%;">
                    <h1 id="${this.props.id}-label"></h1>
                    <p id="${this.props.id}-readout"></p>
                </div>
            </div>`
        }


        let setupHTML = (app) => {}

        return {HTMLtemplate, setupHTML}
    }

    default = (userData) => {
        let labelDiv = document.getElementById(`${this.props.id}-label`)
        labelDiv.innerHTML = userData[0].meta.label
        let outputDiv = document.getElementById(`${this.props.id}-readout`)
        let value = (!Array.isArray(userData[0].data)) ? userData[0].data : userData[0].data[0]
        if (typeof value === "number") value = value.toFixed(2)
        outputDiv.innerHTML = `<p>${userData[0].username}: ${value}</p>`

        return userData
    }

    deinit = () => {}
}

export {UI}