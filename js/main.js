const TextInput = document.querySelector(".input");
const zipCodeInput = document.querySelector(".zip");

//add event to press "enter" and get response. but first validate.
TextInput.addEventListener("keydown", (event)=>{singleInputValidation(event,true);});
const uploadfile = () =>{FileUploader("Upload")}
const DownLoadFileResults = () =>{FileUploader("Download")}

//validate input. check for numbers only, length of 5 and uncomplete zipcodes.
const singleInputValidation = (event,fromKeyDown = false) =>{
    let input = zipCodeInput.value;

    //get inputs from either button or key pressed.
    const isNumber = fromKeyDown? /^[0-9]$/i.test(event.key):true; 
    const keyCode = fromKeyDown? event.keyCode: 13; // 13 = "enter key"
    const validate = keyCode === 13 || !fromKeyDown; // "enter" was pressed or button clicked

    //validate input.. length, emtpy. etc.
    if (isNumber || validate) {
        ValidateZipcode(validate,input);
    }
}

//validate zipcode. lenght, is us zipcode, empty values, etc.
const ValidateZipcode = (validate,input, returnMessage = false) =>{
    switch (true) {
        case validate && input.length === 0:
            //there must be a value.
            let emptyMessage = "Empty value, there must be a 5 digit zipcode."
            return returnMessage? emptyMessage: handleErrorMessage(emptyMessage);
        case validate &&  !(/^\d+$/.test(input)):
            //display error if the zipcode is less than 5 digits    
            let mixCharactersMessage = "Invalid Zipcode, Zipcode must be integers characters only.";
            return returnMessage? mixCharactersMessage: handleErrorMessage(mixCharactersMessage);
        case validate && input.length < 5 || input.length > 5:
            //display error if the zipcode is less than 5 digits    
            let shortMessage = "Invalid Zipcode, Zipcode must be 5 characters.";
            return returnMessage? shortMessage: handleErrorMessage(shortMessage);
        case validate && input.length === 5 && (parseInt(input) < 501 || parseInt(input) > 99950) :
            //if input is 5 digits then call api.
            let notUSZipcodeMessage = "Invalid Zipcode, This is not a US zipcode.";
            return returnMessage? notUSZipcodeMessage: handleErrorMessage(notUSZipcodeMessage);
        case validate && input.length === 5:
            //cut characters after 5 digits
            return !returnMessage? findZipcodeInfo([input]) :null;
        case (input.length + 1) > 5:
            //cut characters after 5 digits
            return !returnMessage? zipCodeInput.value = input.slice(0, 4) :null;
        default:
            return;
    }
}

//shareble function for error messages.
const handleErrorMessage = message =>{
    showIcon(false);
    return document.querySelector("#output").innerHTML = ` <article class="message is-danger"> 
    <div class="message-header">
    <p>Error</p>
    <button class="delete" onclick=deleteLocation() ></button>
    </div>
    <div class="message-body">${message}</div></article>`;
}

//call api after input was validated.
const findZipcodeInfo = async(zipCode,isFile = false) =>{
    //get all the calls.
    let apiCalls = await zipCode.map(zipCode =>fetch("https://api.zippopotam.us/us/" + zipCode));
    //use promise to make sure all calls are complete.
    Promise.all(apiCalls).
    then(Apiresponses =>{
        // Get a JSON object from each of the responses
        return Promise.all(Apiresponses.map(response=> {
            //success
            if(response.status !== 200){
                //wrong zipcode from file
                if(isFile){
                    //find out why it faild. maybe length, mixcharacters. etc..
                    let failedZipcode = response.url.substring(response.url.lastIndexOf('/') + 1);
                    return {zipCode: failedZipcode,isValid:false, Error:ValidateZipcode(true,failedZipcode,true)};
                }else{
                    //wrong zipcode from single search
                    handleDisplayResult("invalid",isFile);
                }
            }else{
                //success
                showIcon(true);
                return response.json();
            }
        }));
    }).then((data) =>{
        //handle all responses after api calls are complete.
        //accept only found results
        if(data[0] !== undefined){
            handleDisplayResult("success",data,isFile);
        }
    }).catch((error) =>{
        // if there's an error, log it
        console.log(error);
    });
}

const handleDisplayResult = async(result,data,isFile = false) =>{
    //if wrong zipcode and single search then display error. 
    if(result === "invalid" && !isFile){
        showIcon(false);
        return handleErrorMessage("Invalid Zipcode, please try again");
    }else if(result === "success"){// handle success response.
        //response comming from file.
        if(isFile){
            Promise.all(data).
            then(responses =>{
                // Get a JSON object from each of the responses
                return Promise.all(responses.map(response =>{
                    //string to create response txt file.
                    if(response.places != undefined){
                        let locations = response.places[0];
                        return `Zipcode: ${response["post code"]}, Place: ${locations["place name"]}, Longitude: ${locations["longitude"]}, Latitude: ${locations["latitude"]} \n`;
                    }else{
                        //add error if api called failed.
                        return `Zipcode: ${response["zipCode"]}, Error: ${response["Error"]} \n`;
                    }
                }));
            }).then(data =>{
                //download response txt file and reset fields
                makeTextFile("example",data.join(""));
                document.querySelector("#output").innerHTML = "";
                document.getElementById("fileToLoad").value = null;
            }).catch(error =>{                 
                // if there's an error, log it
                console.log(error);
            });
        }else{
            //display zipcodes to look for.
            let output = "";
            data.forEach(objectItem=>{
                objectItem.places.forEach(place => {
                    output += `<article class="message is-primary">
                            <div class="message-header">
                                <p>Location Info</p>
                                <button class="delete" onclick=deleteLocation() ></button>
                            </div>
                            <div class="message-body">
                                <ul>
                                <li><strong>City: </strong>${place["place name"]}</li>
                                <li><strong>State: </strong>${place["state"]}</li>
                                <li><strong>Longitude: </strong>${place["longitude"]}</li>
                                <li><strong>Latitude: </strong>${place["latitude"]}</li>
                                </ul>
                            </div>
                            </article>`;
                    });
            });   
            document.querySelector("#output").innerHTML = output;
        }    
    }
}

const FileUploader = event =>{
    let fileToLoad = document.getElementById("fileToLoad").files[0];
    let textFile = /text.*/;
    let excelFile = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    let zipCodeslist = [];
    //validate file. Make sure exist and it's not empty.
    if(!fileToLoad){
        return handleErrorMessage("Not file found. Please upload a txt file.");
    }else if(fileToLoad.size === 0){
        return handleErrorMessage("Empty file. Please upload a file with a list of zipcodes.");    
    }
    
    let isExcelFile = fileToLoad.type === excelFile;
    let fileReader = new FileReader();
    //get text inside file.
    if (fileToLoad.type.match(textFile) || isExcelFile) {
        fileReader.onload = fileLoadedEvent =>{
            //excel file.
            var textResult = fileLoadedEvent.target.result;
            if(isExcelFile){
                var data = new Uint8Array(textResult);
                var workbook = XLSX.read(data, {type: 'array'});
                var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                // header: 1 instructs xlsx to create an 'array of arrays'
                zipCodeslist = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
          
            }else{
                //parse out text file
                zipCodeslist = textResult.split(/(\r\n|\n|\r)/gm).filter(item => item.trim().length > 0);
            }
            //what do we do with the file?
            if(event === "Upload"){
                //display zipcodes to get.
                document.querySelector("#output").innerHTML =  '<p>Zipcodes:</p>' + zipCodeslist.join(" ");
            }else if(event === "Download"){
                //download results
                findZipcodeInfo(zipCodeslist,true);
            }
        };
    } else {
        //not a txt file
        handleErrorMessage("It doesn't seem to be a text file!");
    }

    //how to read file.
    if(isExcelFile){
        fileReader.readAsArrayBuffer(fileToLoad);
    }else{
        fileReader.readAsText(fileToLoad,"UTF-8");
    }
}

//Used to Create Text Files with a STRING filename and STRING data.
const makeTextFile = (filename, data, extension = "txt") =>{
	// Order of data and filename are flipped on promptFileDownload.
	promptFileDownload(data, filename + "." + extension, "text/csv");
}

const promptFileDownload = (data, filename, fileType) =>{
	let blob = new Blob([data], { type: fileType });
	if (window.navigator.msSaveOrOpenBlob) {
		window.navigator.msSaveBlob(blob, filename);
	}
	else {
		let elem = window.document.createElement("a");
		elem.href = window.URL.createObjectURL(blob);
		elem.download = filename;
		document.body.appendChild(elem);
		elem.click();
		document.body.removeChild(elem);
		window.URL.revokeObjectURL(blob);
	}
}

// Show check or remove icon
const showIcon = valid =>{
    let iconName = valid? "check":"remove";
    // Clear icons
    document.querySelector(".icon-remove").style.display = "none";
    document.querySelector(".icon-check").style.display = "none";
    // Show correct icon
    document.querySelector(".icon-" + iconName).style.display = "inline-flex";
}

// Delete location box
const deleteLocation = () =>{
    //remove marks for validation
    document.querySelector(".message").remove();
    document.querySelector(".zip").value = "";
    document.querySelector(".icon-remove").style.display = "none";
    document.querySelector(".icon-check").style.display = "none";
}