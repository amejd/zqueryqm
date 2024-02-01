sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/core/format/DateFormat",
    'sap/ui/export/Spreadsheet',
    'sap/ui/export/library',
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
    function (Controller, Filter, FilterOperator, DateFormat, Spreadsheet, exportLibrary) {
        "use strict";
        const EdmType = exportLibrary.EdmType;
        return Controller.extend("zqm.controller.Main", {
            onInit: function () {
                const oSmartTableFilter = this.getView().byId("smartFilterBar");
                const that = this
                oSmartTableFilter.attachSearch(function () {
                    var oDialog = that.getView().byId("BusyDialog");
                    oDialog.open();
                    // Get the values
                    const sLifnr = oSmartTableFilter.getFilterData().Lifnr;
                    const sClass = oSmartTableFilter.getFilterData().class;
                    // const sKlart = oSmartTableFilter.getFilterData().klart;

                    // Prepare the filters
                    let Filters = new Array();

                    sLifnr && Filters.push(
                        that._onGetFilters(sLifnr, "Lifnr")
                    )
                    sClass && Filters.push(
                        that._onGetFilters(sClass, "Class")
                    )

                    // READ DATA FROM THE SERVICE
                    const oModel = that.getOwnerComponent().getModel("ZGW_QM_VENDORQUERY_SRV")
                    oModel.read('/ZVendorSet', {
                        filters: Filters,
                        success: function (oData) {
                            if (oData) {
                                // debugger
                                console.log(oData.results);
                                const jModel = new sap.ui.model.json.JSONModel(oData.results);
                                console.log(oData.results);
                                that.getView().byId('title').setText(`Fournisseurs (${oData.results.length})`)

                                // Sorting
                                oData.results.sort((a, b) => {
                                    const lifnrA = a.Lifnr;
                                    const lifnrB = b.Lifnr;

                                    if (lifnrA < lifnrB) {
                                        return -1;
                                    } else if (lifnrA > lifnrB) {
                                        return 1;
                                    } else {
                                        return 0;
                                    }
                                });

                                oData.results.map((e) => {
                                    if (e.Qualification == '') {
                                        e.Qualification = 'S/O'
                                    }
                                    if (e.EntenteQualite == '') {
                                        e.EntenteQualite = 'S/O'
                                    }
                                    // if (e.QualificationOld == '') {
                                    //     e.QualificationOld = 'S/O'
                                    // }
                                    // if (e.EntenteQualiteOld == '') {
                                    //     e.EntenteQualiteOld = 'S/O'
                                    // }
                                    // if (e.EntenteQualite != '') {
                                    //     e.EntenteQualite = 'Requis'
                                    // }
                                    // if (e.Qualification != '') {
                                    //     e.Qualification = 'Requis'
                                    // }
                                    if (e.QualificationOld == 'QUALIFICATION REQUISE') {
                                        e.QualificationOld = 'Requis'
                                    }else{
                                        e.QualificationOld = 'S/O'
                                    }
                                    if (e.EntenteQualiteOld == 'ENTENTE QUALITÉ REQUISE') {
                                        e.EntenteQualiteOld = 'Requis'
                                    }else{
                                        e.EntenteQualiteOld = 'S/O'
                                    }

                                    return e
                                })

                                that.getView().byId("table").setModel(jModel);
                                oDialog.close();
                            }
                        },
                        error: function (oError) {
                            alert('Error, try again !')
                        }
                    })

                }, { passive: true });
            },
            _onGetFilters: function (sFieldValue, sFieldName) {

                const oFilterEq = new Filter(sFieldName, FilterOperator.EQ, sFieldValue);
                return oFilterEq;

            },
            formatDate: function (oDate) {
                if (!oDate) {
                    return "";
                }

                var oDateFormat = DateFormat.getDateInstance({ pattern: "dd.MM.yyyy" });
                return oDateFormat.format(new Date(oDate));
            },
            onExtractData: function () {
                // Get Dialog
                const oDialog = this.getView().byId("BusyDialog");
                oDialog.open();
                // Get Binding
                const oTable = this.getView().byId('table')
                const oBinding = oTable.getBinding("rows");
                let dataType = "application/vnd.ms-excel";
                // Hidden Link
                const aId = this.createId("hiddenLink")
                let aHyperlink = document.getElementById(aId)
                // Binding
                const that = this
                if (oBinding && oBinding.getLength() > 0) {
                    // Format date
                    oBinding.oList.map((e)=>{
                        if(e.Erdat){
                            e.Erdat = that.formatDate(e.Erdat)
                        }

                        if(e.Udate){
                            e.Udate = that.formatDate(e.Udate)
                        }

                        return e
                    })
                    const htmlCode = this._onGetHTMLExcel(oBinding.oList)
                    aHyperlink.href = `data:${dataType}, ${htmlCode}`;
                    aHyperlink.download = `Liste Fournisseur - ${this.formatDate(new Date())}.xls`;
                    //triggering the function
                    aHyperlink.click();
                    oDialog.close()
                } else {
                    MessageToast.show("No data bound")
                    oDialog.close();
                    return;
                }
            },
            onClearAllFilters: function () {
                // Get the table
                const oTable = this.byId("table");
                const oListBinding = oTable.getBinding();
                // Clear selection
                oTable.clearSelection();

                if (oListBinding) {
                    oListBinding.aSorters = null;
                    oListBinding.aFilters = null;
                }

                for (let iColCounter = 0; iColCounter < oTable.getColumns().length; iColCounter++) {
                    oTable.getColumns()[iColCounter].setSorted(false);
                    oTable.getColumns()[iColCounter].setFilterValue("");
                    oTable.getColumns()[iColCounter].setFiltered(false);
                }

                // Update Binding
                // Remove any filters
                oListBinding.filter([]);
            },
            _onGetHTMLExcel: function (pData) {
                // Date
                const pDate = this.formatDate(new Date())
                // User
                const xnavservice = sap.ushell && sap.ushell.Container.getService && sap.ushell.Container.getService("UserInfo")
                const user = xnavservice != null ? xnavservice.getFullName() : 'Unknown'
                // Access the resource bundle
                const oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle()
                let htmlCode = ''
                htmlCode = `
                            <div id="allfile">
                            <div class="container">
                            <h2>Liste fournisseur</h2>
                            <p style="margin-bottom: 0px;"><b>Date&nbsp;:</b>&nbsp;${pDate}</p>
                            <p style="margin-top: 1px;margin-bottom: 0px;"><b>Utilisateur&nbsp;:</b>&nbsp;${user}</p>
                            </div>
                            <p></p>
                            <table id="customersTable" style="font-family:arial, sans-serif;border: 1px solid black; border-collapse: collapse; margin-top: 20px;">
                            <thead>
                                <tr>
                                    <th style="width: 20em; border: 1px solid black;">Nom</th>
                                    <th style="width: 10em; border: 1px solid black;">Fournisseur</th>
                                    <th style="width: 15em; border: 1px solid black;">${oResourceBundle.getText("CATEGORIE_FOURNISSEUR")}</th>
                                    <th style="width: 15em; border: 1px solid black;">${oResourceBundle.getText("QUALIFICATION")}</th>
                                    <th style="width: 15em; border: 1px solid black;">${oResourceBundle.getText("ENTENTE_QUALITE")}</th>
                                    <th style="width: 20em; border: 1px solid black;">${oResourceBundle.getText("CATEGORIE_FOURNISSEUR_OLD")}</th>
                                    <th style="width: 20em; border: 1px solid black;">${oResourceBundle.getText("QUALIFICATION_OLD")}</th>
                                    <th style="width: 20em; border: 1px solid black;">${oResourceBundle.getText("ENTENTE_QUALITE_OLD")}</th>
                                    <th style="width: 10em; border: 1px solid black;">${oResourceBundle.getText("Ernam")}</th>
                                    <th style="width: 10em; border: 1px solid black;">${oResourceBundle.getText("Erdat")}</th>
                                    <th style="width: 10em; border: 1px solid black;">${oResourceBundle.getText("Username")}</th>
                                    <th style="width: 10em; border: 1px solid black;">${oResourceBundle.getText("Udate")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${pData && pData.map((e) => {
                    return (
                        `
                                            <tr>
                                            <td style="border: 1px solid black;text-align:center;">${e.Name1}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Lifnr}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.CategorieFournisseur}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Qualification}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.EntenteQualite}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.CategorieFournisseurOld}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.QualificationOld}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.EntenteQualiteOld}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Ernam}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Erdat}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Username}</td>
                                            <td style="border: 1px solid black;text-align:center;">${e.Udate}</td>
                                            </tr>
                                            `
                    )
                }).join('')

                    }
                                
                            </tbody>
                            </table>
                        </div>`

                return this._onGetHTMLFullCode(htmlCode)
            },
            _onGetHTMLFullCode: function (pHtmlCode) {
                let fullHTML = `
                    <!DOCTYPE html>
                    <html lang="en">
                    
                    <head>
                    <meta charset="UTF-8">
                    <meta http-equiv="X-UA-Compatible" content="IE=edge">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>ss</title>
                    </head>
                    <body>
                        ${pHtmlCode}
                    </body>
                    </html>
                    `

                fullHTML = fullHTML.replace(/ /g, "%20");
                return fullHTML
            }
        });
    });
