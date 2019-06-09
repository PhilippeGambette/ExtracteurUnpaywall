/*
    Extracteur Unpaywall, v1.0, 2019-06-09
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
// DOI list
var doi = [];

// Index of the latest DOI we tried to test
var lastSentQuery = -1;

// Index of the latest DOI we managed to test
var lastReceivedQuery = -1;

// Information about the latest DOI we tested
var info = new Object();

// Number of publications in open access
var oa = 0;

// Timer to regularly launch queries
var timer = "";

// Result
var result = [["DOI","bilan OA","article en OA d'après Unpaywall ?","revue en OA d'après Unpaywall ?","revue dans le DOAJ d'après Unpaywall ?","Meilleure source du texte intégral selon Unpaywall","Identifiant HAL du dépôt","nb de notices HAL pour ce DOI","article en OA via HAL + ISTEX ?","URL article OA via HAL + ISTEX","texte intégral dans HAL ?","Année de publication"]];


$("#send").on("click",function(){
   // Save values extracted from the DOI list in the table doi
   doi = $("#doiList").val().split("\n");
   
   // Reinitialize lastSentQuery, lastReceivedQuery and info
   lastSentQuery = -1;
   lastReceivedQuery = -1;
   oa = 0;
   
   // Test a new DOI every second, in case the previous test was finished
   timer = setInterval(sendQuery,1000);
})

function sendQuery(){
   // Reinitialize the object to store information about the next publication
   info = new Object();

   // Test the next DOI if the previous one was already tested
   if(lastSentQuery==lastReceivedQuery){      
      // Send a new query
      lastSentQuery += 1;
      
      if(lastSentQuery == doi.length){
         // All DOI have been sent, stop sending queries
         clearInterval(timer);
         $("#progress").html("100");
      } else {
         // Send the next DOI to Unpaywall
         $.get("https://api.unpaywall.org/v2/"+doi[lastSentQuery]+"?email=" + $("#email").val())
          .always(receiveUnpaywall);
      }
   }
}

// Save data received from Unpaywall
function receiveUnpaywall(data){
   
   if (data != undefined){
      // Unpaywall has found the DOI
      info.doi = data.doi;
      info.is_oa = data.is_oa;
      info.journal_is_oa = data.journal_is_oa;
      info.journal_is_in_doaj = data.journal_is_in_doaj;
      info.year = data.year;
      if (data.best_oa_location != undefined){
         info.best_oa_location = "<a href=\""+data.best_oa_location.url+"\">"+data.best_oa_location.evidence+"</a>";
      }
   }
   // Send query about the DOI to HAL
   $.get("http://api.archives-ouvertes.fr/search/?wt=json&fq=doiId_s:(" 
         + doi[lastSentQuery].replace(/\(/g,"\\(").replace(/\)/g,"\\)").replace(/:/g,"\\:")
         + ")&fl=halId_s,fileMain_s,linkExtId_s,linkExtUrl_s,producedDateY_i")
    .done(receiveHal);
}

// Save data received from HAL
function receiveHal(data){
   if(data.response.docs.length>0){
      // HAL has found the DOI
      info.halNb = data.response.numFound;
      info.halId = data.response.docs[0].halId;
      info.linkExtId = data.response.docs[0].linkExtId_s;
      info.linkExtUrl = data.response.docs[0].linkExtUrl_s;
      info.fileMain = data.response.docs[0].fileMain_s;
      if(info.year==undefined){
         info.year = data.response.docs[0].producedDateY_i;
      }
   }
   
   // Prepare values for the next table row to be added
   var col3 = "non";
   if(info.is_oa){col3 = "oui";}

   var col4 = "non";
   if(info.journal_is_oa){col4 = "oui";}

   var col5 = "non";
   if(info.journal_is_in_doaj){col5 = "oui";}

   var col2 = "non-OA";
   if((col3 == "oui")||(col4 == "oui")||(col5 == "oui")||(info.best_oa_location != undefined)||((info.linkExtId != undefined)&&(info.linkExtId != "istex"))||(info.fileMain != undefined)){
      col2 = "OA";
      // increase the number of open access publications found
      oa += 1;
   }
   
   // Add a new row to the table
   $("#results").find("tbody").append("\n<tr>"
   +"<td><small><a href=\"http://dx.doi.org/"+doi[lastSentQuery]+"\">"+doi[lastSentQuery]+"</a></small></td>"
   +"<td>"+col2+"</td>"
   +"<td>"+col3+"</td>"
   +"<td>"+col4+"</td>"
   +"<td>"+col5+"</td>"
   +"<td>"+info.best_oa_location+"</td>"
   +"<td>"+info.halId+"</td>"
   +"<td>"+info.halNb+"</td>"
   +"<td>"+info.linkExtId+"</td>"
   +"<td><small><a href=\""+info.linkExtUrl+"\">"+info.linkExtUrl+"</a></small></td>"
   +"<td><small><a href=\""+info.fileMain+"\">"+info.fileMain+"</a></small></td>"
   +"<td>"+info.year+"</td>"
   +"</tr>");
   var resultRow = [doi[lastSentQuery],col2, col3, col4, col5,info.best_oa_location, info.halId, info.halNb,info.linkExtId,info.linkExtUrl,info.fileMain,info.year];
   result[lastSentQuery+1] = resultRow;
   lastReceivedQuery += 1;
   $("#progress").html(parseInt(1000.0*(lastReceivedQuery+1)/doi.length)/10);
   $("#oa").html(parseInt(1000.0*oa/(lastReceivedQuery+1))/10);
}

/************************************/
/* code below used to download the CSV file
/* derived from the code by A.H. Bitubekk
/* from https://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side
/************************************/

// CSV file
var csvContent = '';

// Download the table containing the results
$("#download").on("click",function(e){
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
   
   // Build date
   var m = new Date(Date.now()).getMonth();
   if(m<10){
      m="0"+m;
   }
   var d = new Date(Date.now()).getDate();
   if(d<10){
      d="0"+d;
   }
   var date = new Date(Date.now()).getFullYear()+"-"+m+"-"+d;
   
   // Save file
   download(csvContent, 'download-'+date+'.csv', 'text/csv;encoding:utf-8');
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