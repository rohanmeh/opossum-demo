'use strict';

const Opossum = require('opossum');
const PrometheusMetrics = require('opossum-prometheus');
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const axios = require("axios")

const app = express();
const port = process.argv[2] || 8080;
const circuit = new Opossum(somethingThatCouldFail1, {
  errorThresholdPercentage: 5,
  resetTimeout: 3000
});

let requestCounter = 0
let failureCounter = 0;

circuit.on('open', () => {
  //console.log(circuit.status.window[0]["failures"], circuit.status.window.length)
  console.log("Circuit Opened", Date().match("2020 (.*) GMT")[1])
});

circuit.on('halfOpen', () => {
  console.log("Circuit Half Open", Date().match("2020 (.*) GMT")[1])
});

circuit.on('reject', () => {
  console.log(requestCounter, "Request denied", Date().match("2020 (.*) GMT")[1])
});
circuit.on('fire', () => {
  //console.log(requestCounter, "Request received", Date().match("2020 (.*) GMT")[1])
});

circuit.on('close', () => {
  console.log("Circuit Closed", Date().match("2020 (.*) GMT")[1])
});

// Provide the circuit to the Opossum Prometheus plugin module
const prometheus = new PrometheusMetrics([circuit]);


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

app.use('/api/test', (request, response) => {
  ++requestCounter
  circuit.fire()
  .then(result => {
    console.log(requestCounter,result.data.origin)
    response.send(result.data.origin)
  })
  .catch(err => {
    console.log(requestCounter, "Failure")
    response.send(err)
  })
});

app.get('/metrics', (request, response) => {
  response.send(prometheus.metrics);
});

app.listen(port, () => console.log(`Circuit Breaker Demo ${port}!`));
//will fail sometimes. can adjust failure rate by modifying the date % X === line below.
function somethingThatCouldFail1(echo) {
  if (Date.now().toString() % 4 === 0) {
    console.log(requestCounter, "External Service Failure", Date().match("2020 (.*) GMT")[1]);
    return Promise.reject(new Error(`Random failure ${failureCounter}`));
  } else {
    console.log(requestCounter, "External Service Success!", Date().match("2020 (.*) GMT")[1])
    const response = {"data": {"origin": "0.0.0.0"}}
    return Promise.resolve(response);
  }
}
//will always* work
//*as long as the external service is active :)
function somethingThatCouldFail2(echo) {
  return new Promise((resolve, reject) => {
    return axios.get("http://httpbin.org/get")
      .then(res => {
        console.log(requestCounter, "External Service Success!", Date().match("2020 (.*) GMT")[1])
        resolve(res)
      })
      .catch((e) => {
        console.log(requestCounter, "External Service Failure", Date().match("2020 (.*) GMT")[1]);
        reject(e)
      });
  })}
  //will always fail
  function somethingThatCouldFail3(echo) {
    return new Promise((resolve, reject) => {
      return axios.get("http://.org/get")
        .then(res => {
          console.log(requestCounter, "External Service Success!", Date().match("2020 (.*) GMT")[1])
          resolve(res)
        })
        .catch((e) => {
          console.log(requestCounter, "External Service Failure", Date().match("2020 (.*) GMT")[1]);
          reject(e)
        });
    })}