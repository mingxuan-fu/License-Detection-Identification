const {PredictionAPIClient} = require("@azure/cognitiveservices-customvision-prediction");
const {ApiKeyCredentials} = require("@azure/ms-rest-js");
const fs = require('fs');
const sharp = require('sharp');
const sizeOfImg = require('image-size');
const Jimp = require('jimp');
const express = require('express');
const path = require('path')
const https = require('follow-redirects').https;

//create the app
const app = express();
const port = 8080;
app.use(express.json({limit: '50mb'}));

//read the file that contains the api keys.
let apiKeys = JSON.parse(fs.readFileSync('credentials.json'));

//set up ms custom vision credentials
const customVisionPredictionKey = apiKeys.customVisionPredictionKey;
const customVisionPredictionEndPoint = "https://computervisionmsal-prediction.cognitiveservices.azure.com";
const projectId = "79bd5e32-17fd-46cd-a16a-3357a1dd09ad";
const iterationName = "license-predict"

const credentials = new ApiKeyCredentials({inHeader: {"Prediction-key": customVisionPredictionKey}});
const client = new PredictionAPIClient(credentials, customVisionPredictionEndPoint);

async function processLicense(img)
{
    //takes in a img buffer and returns a cropped image of the image to only the bit that contains the license
    results = await predictLicense(img)
    if(results.predictions.length > 0)
    {
        cropBox = results.predictions[0].boundingBox
        let croppedImg = await cropImageRatio(
            cropBox.left - cropBox.width * 0.25,
            cropBox.top + cropBox.height * 0.15,
            cropBox.width + cropBox.width * 0.5,
            cropBox.height - cropBox.height * 0.3,
            img
        )
        let jimpedImg = await Jimp.read(croppedImg)
        let scaledImg = await jimpedImg.scaleToFit(1000, 2000).getBufferAsync(Jimp.MIME_JPEG)
        return [scaledImg, results.predictions[0]]
    }
}

async function predictLicense(img)
{
    //takes a img buffer and send it to azure custom vision to detect if it contains license plates.
    let jimpedImg = await Jimp.read(img)
    let scaledImg = await jimpedImg.scaleToFit(2000, 1000).getBufferAsync(Jimp.MIME_JPEG)
    const results = await client.detectImage(projectId, iterationName, scaledImg);
    return results
}

async function readLicenseUsingMSOCR(img)
{
    //takes img buffer and attempt to read it using ms computer vision, returns a concatnated version of the first line of the result
    var options = {
        'method': 'POST',
        'hostname': 'australiaeast.api.cognitive.microsoft.com',
        'path': '/vision/v3.2/ocr?language=unk&detectOrientation=true&model-version=latest',
        'headers': {
            'Ocp-Apim-Subscription-Key': apiKeys.OCRkey,
            'Content-Type': 'application/octet-stream'
        },
        'maxRedirects': 20
    };

    return new Promise((resolve, reject) =>
    {
        var req = https.request(options, function (res)
        {
            var chunks = [];

            res.on("data", function (chunk)
            {
                chunks.push(chunk);
            });

            res.on("end", function (chunk)
            {
                var body = JSON.parse(Buffer.concat(chunks));
                if(body.regions.length > 0)
                {
                    let finalStr = body.regions[0].lines[0].words.reduce((finalStr, word) => finalStr + word.text, '')
                    resolve({status: 'success', prediction: finalStr})
                }
                else
                {
                    resolve(null)
                }
            });

            res.on("error", function (error)
            {
                console.error(error);
            });
        });

        var postData = img;

        req.write(postData);

        req.end();
    }
    )
}

async function cropImageRatio(left, top, width, height, img)
{
    //crops images based on ratios instead of strict pixels
    let pixSize = sizeOfImg(img);
    let cropRegion = {
        left: Math.max(Math.round(left * pixSize.width), 0), //increase crop size, workaround for cases where the model return a selection too small
        top: Math.max(Math.round(top * pixSize.height), 0),
        width: Math.min(Math.round(width * pixSize.width), pixSize.width - Math.max(Math.round(left * pixSize.width), 0)),
        height: Math.min(Math.round(height * pixSize.height), pixSize.height - Math.max(Math.round(top * pixSize.height), 0))
    }
    let cropped = await sharp(img).extract(cropRegion).toBuffer()
    return cropped
}

app.post('/detect-license', async function (req, res)
{
    //takes in image from client and look for license plate, returns cropped license plate
    let img = Buffer.from(String(req.body.image).split(',')[1], 'base64');
    fs.writeFileSync('test_send_img.jpg', img);
    let [croppedImg, location] = await processLicense(img);
    if (croppedImg) 
    {
        let resBody = {
        image: croppedImg.toString('base64'),
        location: location,
        status:'success'
        }
        res.json(resBody);
    } else {
        res.json({status:'failed'})
    }
})

app.post('/identify-license', async function (req, res)
{
    //takes in client image and attempt to read it
    let img = Buffer.from(String(req.body.image).split(',')[1], 'base64');
    let result = await readLicenseUsingMSOCR(img);
    if(result != null)
    {
        res.json(result)
    } else
    {
        res.json({status: 'failed'})
    }
    fs.writeFileSync('test_send_img_cropped.jpg', img);
})

app.get('/', (req, res) =>
{
    res.sendFile(path.join(__dirname, '/static/index.html'));
})

app.listen(port, () => {console.log('listening')})
