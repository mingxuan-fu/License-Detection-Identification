# License plate Detection and Identification API & Test site

to vist the actual site as hosted on Microsoft Azure App Service, please go to the link https://license-plate-read-msa.azurewebsites.net/.

## Problem Statement

There are often times when there is a need to quickly identify and analysis then record the license plates of motor vehicles, for example by a dashcam just before a crash, by a bystander just after a hit and run, or by law enforcement through red light cameras or speed cameras. Before advancement in image recognition in recent years. This could've only been done by a human, costly in both time and money when the volume needed is high. But now, using modern computer vision techniques, this task can be done in an efficient, fast and human free manner. This repository provides a implementation of a cloud API that detects license plate within a image using Microsoft Azure Custom Vision, while also providing the ability to attempt to read the content of that license plate using Azure Computer Vision's OCR capability, and also provides a web interface to interact with it.

## Design Architecture

The application consists of three main components, all of which exists on Microsoft Azure, minimising physical hardware requirements and complex network set ups. These three components are:

* A Azure Custom Vision Component which hosts a custom model, trained to detect the existance of license plates within a image and return their location.

* A Azure Computer Vision Resource which is used by the main application to attempt to read the content within a license plate.

* A Azure App Service Resource which hosts a Node.js server that coordinates communication between the client and the other two resources, which also provides a web interface to interact with the application.

## API

This project contains 2 APIs

### /detect-license

Sending a JSON POST request that contains within its body a 'image' key that contains a urlencoded string of images will result in a response that either consists of another base64 encoded image that is the region of the sent image that contains the license plate cropped and the location of that region within the image and a sucess status, or a response that contains the 'failed' status indicating the model failed to find any license plates in the image

### /identify-license

Sending a JSON POST request that contains within its body a 'image' key that contains a urlencoded string of images (preferably the result of a call to /detect-license) will result in a response that contains the 'predict' key with the predicted license number as its value and the 'success' status, or a 'failed' status indicating that the model failed to find any text data in the image.

## Testing site

this project currently contains a test site that allows for the upload of images, detecting licenses within them, and attempting to identify their license number through Azure Computer Vision. It can be accessed by directly going to the base url.

## Machine Learning Cycles

### Data Phase

A extensive amount of data is needed for any Machine Learning project. In this phase, images containing license plates in usual positions (ie. mounted on cars) is collected and selected, with the ideal being selecting images from a large variaty of lighting conditions and large amount of different types of license plates (most images used in this project is downloaded from https://www.kaggle.com/andrewmvd/car-plate-detection). This data is then fed into Azure Custom Vision using its web interface. Then preprocessing needs to be performed on the uploaded images, during which the location of the license plate in each image is manually tagged in order to perform supervised machine learning. Care is taken to remove images that are not clear, contains significantly non-standard license plate set up, or does not contain enough surrounding vehicle.

### Model Phase

Through the use of online Azure cloud technology, the model phase of the project is much simplified. A largely accurate and high performing model is created via Azure Custom Vision's 'Quick Training' option, which uses the data collected and pre-processed in the Data phase and trains a Neural Network to tag further images based on them. The model used in this project achieved a Precision, Recall and mAP value of over 90%.

### Production Phase

Through Azure Custom Vision, the model trained in the model phase is automatically deployed to the cloud and accessible for prediciton purpose. Further updates to the model through more image uploads or other methods can be performed through the web API of the model as documented in Azure Custom Vision documentation.

## Future plans

* Migrate to custom OCR model to improve the poor accuracy of Azure Computer Vision on License plates.

* development of Android/iOS Application that streamlines the process of 1. take a photo 2. go to website 3. upload the photos 4. identify license plate contained within, into a single click that performs all above actions.

* Provide the functionality of direct VIN & vehicle model/owner look up through governmental license plate lookup sites maintained by VIC roads.