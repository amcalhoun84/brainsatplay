import { gpuUtils } from './gpuUtils.js';
import { eegmath } from './eegmath';

const gpu = new gpuUtils();
addEventListener('message', e => {
  // define gpu instance
  //console.log("worker executing...")
  console.time("worker");
  let output = "function not defined";

  switch (e.data.foo) {
    case "xcor": // Takes 2 1D arrays
      output = eegmath.crosscorrelation(e.data.input[0],e.data.input[1]);
      break;
    case "autocor": // Takes 1 1D array
      output = eegmath.autocorrelation(e.data.input);
      break;
    case "cov1d": // Takes 2 1D arrays
      output = eegmath.cov1d(e.data.input[0],e.data.input[1]);
      break;
    case "cov2d": // Takes 1 2D array with equal width rows
      output = eegmath.cov2d(e.data.input);
      break;
    case "sma": // Takes 1 1D array and an sma window size
      output = eegmath.sma(e.data.input[0],e.data.input[1]);
      break;
    case "dft": // Takes 1 1D array and the number of seconds, and an optional scalar value
      var scalar = 1;
      if(e.data.input[2] !== undefined) scalar = e.data.input[2];
      output = gpu.gpuDFT(e.data.input[0],e.data.input[1],scalar);
      break;
    case "multidft": //Takes 1 2D array with equal width rows, and the number of seconds of data being given
      var scalar = 1;
      if(e.data.input[2] !== undefined) scalar = e.data.input[2];
      output = gpu.MultiChannelDFT(e.data.input[0],e.data.input[1],scalar);
      break;
    case "multidftbandpass": //Accepts 1 2D array of equal width, number of seconds of data, beginning frequency, ending frequency
      var scalar = 1;
      if(e.data.input[4] !== undefined) scalar = e.data.input[4];
      output = gpu.MultiChannelDFT_Bandpass(e.data.input[0],e.data.input[1],e.data.input[2],e.data.input[3],scalar);
      break;
    case "fft": // Takes 1 1D array and the number of seconds, and an optional scalar value
      var scalar = 1;
      if(e.data.input[2] !== undefined) scalar = e.data.input[2];
      output = gpu.gpuFFT(e.data.input[0],e.data.input[1],scalar);
      break;
    case "multifft": //Takes 1 2D array with equal width rows, and the number of seconds of data being given
      var scalar = 1;
      if(e.data.input[2] !== undefined) scalar = e.data.input[2];
      output = gpu.MultiChannelFFT(e.data.input[0],e.data.input[1],scalar);
      break;
    case "multifftbandpass": //Accepts 1 2D array of equal width, number of seconds of data, beginning frequency, ending frequency
      var scalar = 1;
      if(e.data.input[4] !== undefined) scalar = e.data.input[4];
      output = gpu.MultiChannelFFT_Bandpass(e.data.input[0],e.data.input[1],e.data.input[2],e.data.input[3],scalar);
      break;
    case "gpucoh":
      const coher = gpu.gpuCoherence(e.data.input[0],e.data.input[1],e.data.input[2],e.data.input[3],e.data.input[4]);
      output = coher;
      break;
    case "coherence": // Input 2D array, number of seconds, beginning frequency, ending frequency. Outputs an array of products of each FFT with each associated correlogram to create a network map of all available channels, ordered by channel
      const correlograms = eegmath.correlograms(e.data.input[0]);
      const buffer = [...e.data.input[0],...correlograms];
      var dfts;

      var scalar = 1;
      //console.log(mins)
      //console.log(buffer);
      dfts = gpu.MultiChannelDFT_Bandpass(buffer, e.data.input[1], e.data.input[2], e.data.input[3], scalar);
      //console.log(dfts)
      const cordfts = dfts[1].splice(e.data.input[0].length, buffer.length-e.data.input[0].length);
      //console.log(cordfts)

      const coherenceResults = [];
      const nChannels = e.data.input[0].length;

      //cross-correlation dfts arranged like e.g. for 4 channels: [0:0, 0:1, 0:2, 0:3, 1:1, 1:2, 1:3, 2:2, 2:3, 3:3] etc.
      var k=0;
      var l=0;
      cordfts.forEach((row,i) => { //move autocorrelation results to front to save brain power
        if (l+k === nChannels) {
          var temp = cordfts.splice(i,1);
          k++;
          cordfts.splice(k,0,...temp);
          l=0;
          //console.log(i);
        }
        l++;
      });
      //Now arranged like [0:0,1:1,2:2,3:3,0:1,0:2,0:3,1:2,1:3,2:3]

      //Outputs FFT coherence data in order of channel data inputted e.g. for 4 channels resulting DFTs = [0:1,0:2,0:3,1:2,1:3,2:3];

      var autoFFTproducts = [];
      k = 0;
      l = 1;
      cordfts.forEach((dft,i) => {
        var newdft = new Array(dft.length).fill(0);
        if(i < nChannels) { //sort out autocorrelogram FFTs
          dft.forEach((amp,j) => {
            newdft[j] = amp//*dfts[1][i][j];
          });
          autoFFTproducts.push(newdft);
        }
        else{ //now multiply cross correlogram ffts and divide by autocorrelogram ffts (magnitude squared coherence)
          dft.forEach((amp,j) => {
              newdft[j] = amp*amp/(autoFFTproducts[k][j]*autoFFTproducts[k+l][j]);//Magnitude squared coherence;
              if(newdft[j] > 1) { newdft[j] = 1; } //caps the values at 1
              //newdft[j] = Math.pow(newdft[j],.125)
          });
          l++;
          if((l+k) === nChannels) {
            k++;
            l = 1;
          }
          coherenceResults.push(newdft);
        }
      });
      output = [dfts[0], dfts[1], coherenceResults];


      break;

  }

  // output some results!
  console.timeEnd("worker");
  
  postMessage({output: output, foo: e.data.foo, origin: e.data.origin});
});
