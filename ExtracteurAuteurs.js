/*
    Extracteur Unpaywall, v1.3, 2019-07-02
    Évaluer la proportion des publications en libre accès parmi une liste de DOI
    Copyright (C) 2018-2019 - Romain Boistel, Frédérique Bordignon, Philippe Gambette

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

"use strict";
$(document).ready(function(){
// author list
var author = {};

// Index of the latest author we tried to test
var lastSentQuery = -1;

// Index of the latest author we managed to test
var lastReceivedQuery = -1;

// Information about the latest author we tested
var info = new Object();

// Timer to regularly launch queries
var timer = "";

// Get the structure id
var structure = $("#structure").val()

// Number of found publications
var foundPublications = 0

// Result
var result = [];
var resultByName = {};

$("#send").on("click",function(){
   // Reinitialize lastSentQuery, lastReceivedQuery and structure
   lastSentQuery = -1;
   lastReceivedQuery = -1;
   structure = $("#structure").val()
   
   // Reinitialize the table
   result = [];
   resultByName = {};
   
   // Extract the required field list
   result[0] = ("docid,"+$("#champsAuteurs").val()).split(",");
   
   // Fill in the title row of the result tables in the webpage
   $("#results").html('<tr id="titleRow"></tr>');
   $("#results2").html('<tr id="titleRow2"></tr>');
   result[0].forEach(function(col){
      $("#titleRow").append("<th>"+col+"</th>");
      $("#titleRow2").append("<th>"+col+"</th>");
   });
   
   // Extract the list of all authors of the structure
   //var url = "https://api.archives-ouvertes.fr/search/?q=*:*&rows=0&facet=true&facet.field=structHasAuthId_fs&facet.prefix="+$("#structure").val()+"_&wt=json"
   var url = "http://api.archives-ouvertes.fr/search/?q=structId_i:"+structure+"&wt=json&fl=structHasAuthId_fs&rows=10000";
   if($("#annees").val() != ""){
      url = "http://api.archives-ouvertes.fr/search/?q=structId_i:"+structure+"&fq=producedDateY_i:"+$("#annees").val()+"&wt=json&fl=structHasAuthId_fs&rows=10000";
   }
   $.get(url).done(authorList);
   console.log(url);
})


function authorList(data){
   // Explore all publications:
   for(var i in data.response.docs){
      foundPublications += 1;
      // Check all authors of the publication:
      var authors = data.response.docs[i].structHasAuthId_fs;
      for (var a in authors){
         // Get the structure id and the author id with this regular expression:
         var ids = /^([^_]*)_.*JoinSep_([^_]*)_FacetSep/.exec(authors[a]);
         if(ids != null){
            if(ids[1] == structure){
               // If the author belongs to the structure, save it!
               author[ids[2]] = 1;
            }
         }
      }
   }
   
   if(data.response.numFound>foundPublications){
      var url = "http://api.archives-ouvertes.fr/search/?q=structId_i:"+structure+"&wt=json&fl=structHasAuthId_fs&rows=10000&start="+foundPublications;
      if($("#annees").val() != ""){
         url = "http://api.archives-ouvertes.fr/search/?q=structId_i:"+structure+"&fq=producedDateY_i:"+$("#annees").val()+"&wt=json&fl=structHasAuthId_fs&rows=10000&start="+foundPublications;
      }
      console.log(url);
      $.get(url).done(authorList);
   } else {
      timer = setInterval(sendQuery,3000);
   }
}

function sendQuery(){
   // Test the next author if the previous one was already tested
   if(lastSentQuery==lastReceivedQuery){      
      // Reinitialize the object to store information about the next author
      info = new Object();

      // Send a new query
      lastSentQuery += 1;
      
      if(lastSentQuery == Object.keys(author).length){
         // All author have been sent, stop sending queries
         clearInterval(timer);
         $("#progress").html("100");
         
         // Fill in the table without duplicate names:
         var allFullNames = Object.keys(resultByName);
         // Loop through all authors (without duplicate names)
         allFullNames.forEach(function(name){
            // Loop through all information of this author
            var row = "";
            resultByName[name].forEach(function(element){
               row += "<td>"+element+"</td>"
            })
            // Add a new row to the table without duplicate names
            $("#results2").find("tbody").eq(0).append("\n<tr id=\"" + resultByName[name][0] + "\">" + row + "</tr>");
         })         
         
         
      } else {
         // Send the next author to HAL
         $.get("https://api.archives-ouvertes.fr/ref/author/?wt=json&q=docid:%22" + Object.keys(author)[lastSentQuery] + "%22&fl=docid," + $("#champsAuteurs").val())
          .always(receiveHal);
      }
   }
}

// Save data received from HAL
function receiveHal(data){
   if(data.response.docs[0] != undefined){
      // Add a new row to the table
      var row = "";
      var resultRow = [];
      result[0].forEach(function(key){
         if(key=="valid_s"){
            if(data.response.docs[0][key] == "VALID"){
               data.response.docs[0][key]="forme auteur principale d'un IdHAL";
            }
            if(data.response.docs[0][key] == "OLD"){
               data.response.docs[0][key]="forme auteur alternative d'un IdHAL";
            }
            if(data.response.docs[0][key] == "INCOMING"){
               data.response.docs[0][key]="forme auteur sans IdHAL associé";
            }
         }
         row += "<td>"+data.response.docs[0][key]+"</td>"
         resultRow.push(data.response.docs[0][key])
      })
      
      // Add a new line to the result table in the webpage:
      $("#results").find("tbody").eq(0).append("\n<tr id=\"" + Object.keys(author)[lastSentQuery] + "\">" + row + "</tr>");
      
      // Decide if the new author id must be added to the table without duplicate or not.
      if(resultByName[data.response.docs[0]["fullName_s"]] != undefined){
         if(resultByName[data.response.docs[0]["fullName_s"]]["valid_s"]=="forme auteur sans IdHAL associé"){
            if(data.response.docs[0]["valid_s"] != "forme auteur sans IdHAL associé"){
               resultByName[data.response.docs[0]["fullName_s"]] = resultRow;
            }
         }
         if(resultByName[data.response.docs[0]["fullName_s"]]["valid_s"]=="forme auteur alternative d'un IdHAL"){
            if(data.response.docs[0]["valid_s"] == "forme auteur principale d'un IdHAL"){
               resultByName[data.response.docs[0]["fullName_s"]] = resultRow;
            }
         }
      } else {
         resultByName[data.response.docs[0]["fullName_s"]] = resultRow;
      }
      result[lastSentQuery+1] = resultRow;
   }
   
   // Go the next author query
   lastReceivedQuery += 1;
   
   // Update the progress rate and the open access rate
   $("#progress").html(parseInt(1000.0*(lastReceivedQuery+1)/Object.keys(author).length)/10);
   
}


// Create a string containing the current date of the form YYYY-MM-DD
function buildDate(){
   // Build date
   var m = new Date(Date.now()).getMonth()+1;
   if(m<10){
      m="0"+m;
   }
   var d = new Date(Date.now()).getDate();
   if(d<10){
      d="0"+d;
   }
   return new Date(Date.now()).getFullYear()+"-"+m+"-"+d+"_"+new Date(Date.now()).getHours()+"h"+new Date(Date.now()).getMinutes();
}



/************************************/
/* code below used to download the CSV file
/* derived from the code by A.H. Bitubekk
/* from https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
/************************************/


// Download the table containing the results
$("#download").on("click",function(e){

   // CSV file
   var csvContent = '';

   e.preventDefault();
   
   // Building the CSV from the Data two-dimensional array
   // Each column is separated by ";" and new line "\n" for next row
   result.forEach(function(infoArray,index) {
      var dString = "";
      infoArray.forEach(function(str){
         if(str==undefined){
            str="";
         } else {
            str=""+str;
         }
         dString += '"'+str.replace(/"/g,'""')+'";';
      })
      csvContent += index < result.length ? dString + '\n' : dString;
   });
   
   // Save file
   download(csvContent, 'download-'+buildDate()+'.csv', 'text/csv;encoding:utf-8');
})


// Download the table containing the results without duplicates
$("#download2").on("click",function(e){


   // CSV file download
   var csvContent = '';

   e.preventDefault();
   
   // Building the CSV from the Object associating an array to each key
   // Each column is separated by ";" and new line "\n" for next row

   //Title row
   var dString = "";
   result[0].forEach(function(str){
      if(str==undefined){
         str="";
      } else {
         str=""+str;
      }
      dString += '"'+str.replace(/"/g,'""')+'";';
   })
   csvContent += dString + '\n';

   Object.keys(resultByName).forEach(function(infoArray,index) {
      dString = "";
      resultByName[infoArray].forEach(function(str){
         if(str==undefined){
            str="";
         } else {
            str=""+str;
         }
         dString += '"'+str.replace(/"/g,'""')+'";';
      })
      csvContent += index < result.length ? dString + '\n' : dString;
   });
   
   // Save file
   download(csvContent, 'download-noDuplicate-'+buildDate()+'.csv', 'text/csv;encoding:utf-8');
})


// The download function takes a CSV string, the filename and mimeType as parameters
// Scroll/look down at the bottom of this snippet to see how download is called
function download(content, fileName, mimeType) {
  var a = document.createElement('a');
  mimeType = mimeType || 'application/octet-stream';

  if (navigator.msSaveBlob) { // IE10
    navigator.msSaveBlob(new Blob([content], {
      type: mimeType
    }), fileName);
  } else if (URL && 'download' in a) { //html5 A[download]
    a.href = URL.createObjectURL(new Blob([content], {
      type: mimeType
    }));
    a.setAttribute('download', fileName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  } else {
    location.href = 'data:application/octet-stream,' + encodeURIComponent(content); // only this mime type is supported
  }
/************************************/

}


})