
import {brainsatplay} from './js/brainsatplayv2.js'
import {DOMFragment} from './js/frontend/utils/DOMFragment.js'

let connectHTML = `
	<button id='connect'>Connect Device</button>
    <button id='server'>Connect to Server</button>
    <button id='send'>Send Ping</button>
`; 


let bcisession = new brainsatplay('guest','');

let ui = new DOMFragment(
	connectHTML,
	document.body,
	undefined,
	() => {
		document.getElementById('connect').onclick = () => {
			if(bcisession.info.auth.authenticated) bcisession.connect('freeeeg32_2',['eegcoherence'],true,['EEG_Ch','FP1','all']);
			else bcisession.connect('freeeeg32_2',['eegcoherence']);
		}
		document.getElementById('server').onclick = () => {
			bcisession.login();
    	}
    	document.getElementById('send').onclick = () => {
			bcisession.sendWSCommand(["ping"]); //send array of arguments
		}
	},
	undefined,
	'NEVER');
