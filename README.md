# ExtracteurUnpaywall
Évaluer la proportion des publications en libre accès parmi une liste de DOI

Démo : http://igm.univ-mlv.fr/~gambette/ExtractionHAL/ExtracteurUnpaywall

URL de l'API de HAL pour évaluer le taux de libre accès d'une collection HAL (ici LIGM) : https://api.archives-ouvertes.fr/search/?q=collCode_s:LIGM&fq=docType_s:ART&rows=2000&wt=xml&fl=doiId_s,halId_s,publicationDateY_i,submittedDateY_i,fileMain_s

## À propos...
Outil codé par Philippe Gambette, dérivé d'un outil conçu par Frédérique Bordignon et Romain Boistel

## Autres fonctionnalités
* recenser les informations sur les auteurs affiliés à une structure (ou plusieurs) : ExtracteurAuteur.html ; démo : http://igm.univ-mlv.fr/~gambette/ExtractionHAL/ExtracteurUnpaywall/ExtracteurAuteurs.html
