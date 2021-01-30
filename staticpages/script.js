
const getUploadLinkURL = "https://6kd3dqvw7l.execute-api.us-east-1.amazonaws.com/getsignedurl";


function formSubmit(){
  document.getElementById("SubmitData").style.display = "none";
  document.getElementById("submitStatus").innerHTML = "sending request for upload...";

  var gameName = document.forms["gameUpload"]["gameName"]["value"];
  
  var xhttp1 = new XMLHttpRequest();
  xhttp1.onreadystatechange = function() {
    if (this.readyState == 4 && this.status == 200) {
      document.getElementById("submitStatus").innerHTML = "Uploading game zip to storage..."
      uploadFile(JSON.parse(this.responseText));
    } else {
      // Dont know why, when testing this text was shown even though submission was valid and went through
      // document.getElementById("submitStatus").innerHTML = "Unable to get signed url for upload"
    }
  };
  xhttp1.open("GET", getUploadLinkURL + "?name=" + gameName, false);
  xhttp1.send();
}

function uploadFile(response){

  var formData = new FormData();
  var postURL = response.url;
  var fields = response.fields;
  for (var fieldKey in fields){
    formData.append(fieldKey, fields[fieldKey]);
  }
  var file = document.forms["gameUpload"]["gameZip"]["files"][0];
  formData.append("file", file)

  var xhttp2 = new XMLHttpRequest();
  xhttp2.onreadystatechange = function() {
    document.getElementById("submitStatus").innerHTML = "Sent game zip to storage"
  }
  xhttp2.open("POST", postURL);
  xhttp2.send(formData);
}