import { init, Ditto } from '@dittolive/ditto'
import express from 'express'
import fs from 'fs'
import { spawn } from 'child_process';

const app = express();
const port = 3000;

let pythonProcess = null;

// Increase the limit to, for example, '50mb'
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.post('/model/insert/', async (req, res) => {
    console.log("Performing Insert...");
    const modelData = req.body; // The JSON payload

    const new_model = {
        ...modelData
    }

    // Here, you would insert the new model into your Ditto store or another storage system
    // Example (adjust according to your actual data structure and requirements):
    await ditto.store.execute(
        `INSERT INTO contact
        DOCUMENTS (:new_model)`,
        { new_model }
    )

    // Respond to the request indicating success
    res.status(201).send({ message: "Report inserted successfully" });
});

app.post('/model/start/', async (req, res) => {
    console.log("Starting ATR...");

    ////
    // Send Start
    ////
    const start_message = {
        _id: "status",
        status: "start"
    }

    await ditto.store.execute(
        `INSERT INTO contact
        DOCUMENTS (:start_message)
        ON ID CONFLICT DO UPDATE`,
        { start_message }
    )

    // Respond to the request indicating success
    res.status(201).send({ message: "Started successfully" });
});

app.post('/model/stop/', async (req, res) => {
    console.log("Stopping ATR...");

    ////
    // Send Stop
    ////
    const stop_message = {
        _id: "status",
        status: "stop"
    }

    await ditto.store.execute(
        `INSERT INTO contact
        DOCUMENTS (:stop_message)
        ON ID CONFLICT DO UPDATE`,
        { stop_message }
    )

    // Respond to the request indicating success
    res.status(201).send({ message: "Stopped successfully" });
});

app.post('/model/update/:id', async (req, res) => {
    console.log("Performing Update...");
    const id = req.params.id; // The ID from the URL
    const updates = req.body; // The JSON payload with updates

    const update_doc = {
        _id: id,
        ...updates
    }

    // Here, you would update the existing model in your Ditto store
    // Example (adjust according to your actual data structure and requirements):
    // await ditto.store.execute(
    //     `INSERT INTO model
    //     DOCUMENTS (:update_doc)
    //     ON ID CONFLICT DO UPDATE`,
    //     { update_doc }
    // )

    const setString = Object.entries(updates)
        .map(([key, value]) => `${key} = '${value}'`)
        .join(', ');

    
    console.log(setString);


    await ditto.store.execute(
        `UPDATE model
        SET ${setString}
        WHERE _id = (:id)`
    )

    const get_data = await ditto.store.execute(
        `SELECT * 
        FROM model 
        WHERE _id = 'test5'`,
        null
    )

    let changeHandler =
        get_data.items.forEach((element) => {
          fs.writeFile("test.json", element.jsonString(), function(err) {
            if (err) {
                console.log(err);
            }
        });
    })

    // Respond to the request
    res.status(201).send({ message: "Model updated successfully", id: id });
});

let ditto
let liveQuery
let statusQuery
let statusSub
let tasks = []
let models = []
let subscription

async function main () {
    await init()

    // This is technically creating a big peer instance?
    ditto = new Ditto({
        type: 'onlinePlayground',
        appID: '71add2bb-0c43-4d8e-a619-bfa29f93a225',
        token: '24b762b8-4161-4663-b52a-e216a816fdc0'
    });

    // Start the Express server
    app.listen(port, () => {
        console.log(`Server running at http://localhost:${port}`);
    });

    ditto.startSync();

    const liveQueryCallback = (docs, event) => {
        // store documents that match out query in the local tasks object
        console.log("Updating Tasks...")
        console.log(new Date().toISOString());
        models = docs;
        console.log(models);
        // const model_data = models.map((model) => model.value);
        // const obj = Object.fromEntries(model_data);
        // fs.writeFile("test.txt", obj, function(err) {
        //     if (err) {
        //         console.log(err);
        //     }
        // });
    }

    const statusQueryCallback = (docs, event) => {
        console.log("statusQueryCallback...")
        // const get_data = ditto.store.execute(
        //     `SELECT * 
        //     FROM contact 
        //     WHERE _id = 'status'`,
        //     null
        // )

        console.log(docs.value)

        // Assuming `docs.value['status']` contains either 'start' or 'stop'
        if (docs.value['status'] == 'start') {
            console.log('Starting ATR...');

            // Use fetch to call the /run endpoint
            fetch('http://127.0.0.1:5000/run', {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.message); // Log the response from the Flask app
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        } else if (docs.value['status'] == 'stop') {
            console.log('Stopping ATR...');

            // Use fetch to call the /stop endpoint
            fetch('http://127.0.0.1:5000/stop', {
                method: 'GET'
            })
            .then(response => response.json())
            .then(data => {
                console.log(data.message); // Log the response from the Flask app
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        } else {
            console.log("Unknown status...");
        }

        // let changeHandler = 
        //     get_data.items.forEach((element) => {
        //         console.log(element.jsonString())
        //     })
    }

    liveQuery = 
        ditto.store
            .collection("contact")
            .findAll()
            .observeLocal(liveQueryCallback)

    models = 
        await ditto.store
        .collection("contact")
        .findAll()

    subscription = 
        ditto.store
            .collection("contact")
            .findAll()
            .subscribe()

    statusQuery = 
        ditto.store
            .collection("contact")
            .findByID("status")
            .observeLocal(statusQueryCallback)

    statusSub = 
        ditto.store
            .collection("contact")
            .findByID("status")
            .subscribe()
}

main()
