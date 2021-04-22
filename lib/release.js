const slug = require('slug');
const ucwords = require('locutus/php/strings/ucwords');
const laundry = require('company-laundry');
const _ = require('lodash');
const isNull = _.isnull;
const camelCase = _.camelcase;

function repairDate(string) {
    var [ date, time ] = string.split(' ');
    var [ month, day, year ] = date.split('/');

    if(year.length == 2) year = '20' + year;
    return year + '-' + month.padStart(2, '0') + '-' + day.padStart(2, '0') + ((time)? ' ' + time : '');
}

function dateToISOString(string) {
  if(string.length < 10) return null;
  if(string.indexOf('/') >= 0) string = repairDate(string);
  const [ date, time ] = string.split(' ');
  const [ year, month, day ] = date.split('-');
  if (time) {
    const [ hour, minute, second ] = time.split(':');
    if (second) {
      return new Date(Date.UTC(year, (+month -1), day, hour, minute, second)).toISOString();
    }
    // console.log(year, (+month -1), day, hour, minute);
    return new Date(Date.UTC(year, (+month -1), day, hour, minute)).toISOString();
  }
  return new Date(Date.UTC(year, (+month -1), day)).toISOString();

}

function getOCID(string) {
    return `ocds-0ud2q6-${string}`
}

function orgObject(name) {
    // doc is an organization
    if (name) {
        let laundered = laundry.launder(name);
        const o = {
            name: name,
            id: laundry.simpleName(laundered),
        };
        return o;
    }
}

function organizationReferenceObject(string) {
    let laundered = laundry.launder(string);
    let simple = laundry.simpleName(laundered);
    return {
        name: string,
        uri: `https://www.quienesquien.wiki/orgs/${simple}`,
    };
}

function getTenderID(item) {
    // let num_pedido = item.hasOwnProperty('num_pedido')? item.num_pedido.trim() : null;
    // let num_orden_compra = item.hasOwnProperty('num_orden_compra')? item.num_orden_compra.trim() : null;
    //
    // if(num_orden_compra) return num_orden_compra;
    // else if(num_pedido) return num_pedido;
    // else return item.id_ficha;
    return item.id_ficha;
}

function getProcurementCategory(string) {
    switch(string) {
        case 'Bienes': return 'goods';
        case 'Servicios': return 'services';
        case 'Obras': return 'works';
    }
}

function getProcurementMethod(string) {
    switch(string) {
        case 'Adjudicación Directa': return 'direct';
        case 'Compra emergente en unidades de servicio': return 'direct';
        case 'Licitación pública': return 'open';
        case 'Invitación a cuando menos tres proveedores': return 'limited';
    }
}

function getClaveCBMWithDots(string) {
    return string.substring(0, 3) + '.' + string.substring(3, 6) + '.' + string.substring(6, 10) + '.' + string.substring(10);
}

function getClaveProductoWithDots(string) {
    return string.substring(0, 3) + '.' + string.substring(3, 6) + '.' + string.substring(6, 10) + '.' + string.substring(10, 12) + '.' + string.substring(12, 14);
}

function getItemID(item) {
    let itemID = '';

    if(item.hasOwnProperty('cbmei') && item.cbmei.hasOwnProperty('clave') && item.cbmei.clave.hasOwnProperty('clave_original') && item.cbmei.clave.clave_original != '')
        itemID = item.cbmei.clave.clave_original;
    else if(item.hasOwnProperty('clave_cbm') && item.clave_cbm != '')
        itemID = getClaveCBMWithDots(item.clave_cbm);
    else if(item.hasOwnProperty('clave_producto'))
        itemID = getClaveProductoWithDots(item.clave_producto);
    else if(item.hasOwnProperty('clave')) {
        let parts = [];
        if(item.clave.hasOwnProperty('grupo_id')) parts.push(item.clave.grupo_id);
        if(item.clave.hasOwnProperty('especifico_id')) parts.push(item.clave.especifico_id);
        if(item.clave.hasOwnProperty('diferenciador_id')) parts.push(item.clave.diferenciador_id);
        if(item.clave.hasOwnProperty('variante_id')) parts.push(item.clave.variante_id);
        if(item.clave.hasOwnProperty('extra_id')) parts.push(item.clave.extra_id);
        itemID = parts.join('.');
    }
    else
        itemID = item.id_ficha;

    return itemID;
}

function getTenderItem(item) {
    let itemID = getItemID(item);
    let itemObj = { id: itemID }

    let itemDescription = '';
    if(item.hasOwnProperty('descripcion')) itemDescription = item.descripcion;
    else if(item.hasOwnProperty('producto')) itemDescription = item.producto;
    if(itemDescription) Object.assign(itemObj, { description: itemDescription });

    if(item.hasOwnProperty('cantidad_consolidada')) Object.assign(itemObj, { quantity: item.cantidad_consolidada });
    if(item.hasOwnProperty('unidad')) Object.assign(itemObj, { unit: item.unidad });

    return itemObj;
}

function tenderObject(items) {
    const parent = 'Instituto Mexicano del Seguro Social';
    const partyName = items[0].delegacion;

    let tenderID = getTenderID(items[0]);

    const document = {
        id: tenderID,
        procuringEntity: {
            id: laundry.simpleName(laundry.launder(partyName)) + '-' + laundry.simpleName(laundry.launder(parent)),
            name: partyName,
        },
        mainProcurementCategory: getProcurementCategory(items[0].categoria),
        additionalProcurementCategories: [ items[0].subcategoria ],
        procurementMethod: getProcurementMethod(items[0].procedimiento_unificado)
    };

    if(items[0].hasOwnProperty('rubro')) document.additionalProcurementCategories.push(items[0].rubro);
    if(items[0].hasOwnProperty('documentos') && items[0].documentos.trim() != '') Object.assign(document, { awardCriteriaDetails: items[0].documentos });
    if(items[0].hasOwnProperty('ambito_licitacion') && items[0].ambito_licitacion.trim() != '')
        Object.assign(document, { procurementMethodCharacterMxCnet: items[0].ambito_licitacion })

    let total_amount = 0;
    let tenderItems = [];
    items.map( item => {
        tenderItems.push(getTenderItem(item));
        total_amount += item.monto;
    } );
    Object.assign(document, { items: tenderItems, value: { amount: total_amount } });

    return document;
}

function awardObject(items) {
    const suppliers = [
        orgObject(items[0].proveedor)
    ];

    let documents = [];
    let total_amount = 0;
    let awardItems = [];
    items.map( item => {
        documents.push({
            id: 'doc-imss-' + item.id_ficha,
            documentType: 'awardNotice',
            url: item.url,
            format: 'text/html',
            language: 'es'
        });
        awardItems.push(getTenderItem(item));
        total_amount += item.monto;
    } )

    let awardObject = {
        id: getTenderID(items[0]),
        suppliers: suppliers,
        value: {
            amount: total_amount,
            currency: 'MXN',
        },
        documents: documents,
        items: awardItems
    };

    return awardObject;
}

function getContractItem(item) {
    let itemID = getItemID(item);
    let itemName = '';
    let itemDescription = '';
    let itemPresentation = '';
    let itemClassification = null;

    if(item.hasOwnProperty('cbmei')) {
        itemClassification = { scheme: 'CBMEI' }
        if(item.cbmei.hasOwnProperty('clave')) {
            itemClassification.id = itemID;
        }
        if(item.cbmei.hasOwnProperty('nombre')) itemClassification.description = item.cbmei.nombre;
        if(item.cbmei.hasOwnProperty('descripcion')) {
            itemDescription = item.cbmei.descripcion;
            itemClassification.descriptionMxIMSS = itemDescription;
        }
        if(item.cbmei.hasOwnProperty('presentacion')) itemClassification.presentationMxIMSS = item.cbmei.presentacion;
    }
    else {
        if(item.hasOwnProperty('producto')) itemName = item.producto;
        if(item.hasOwnProperty('descripcion')) itemDescription = item.descripcion;
    }
    let itemObj = {
        id: itemID,
        description: itemDescription
    }
    if(itemClassification) Object.assign(itemObj, { classification: itemClassification });

    if(!itemDescription) {
        if(item.hasOwnProperty('descripcion')) itemDescription = item.descripcion;
        else if(item.hasOwnProperty('producto')) itemDescription = item.producto;
    }
    if(itemDescription) Object.assign(itemObj, { description: itemDescription });

    if(item.hasOwnProperty('year') && item.year != null) Object.assign(itemObj, { yearMxIMSS: item.year });
    if(item.hasOwnProperty('estatus_contrato') && item.estatus_contrato != null) Object.assign(itemObj, { contractStatusMxIMSS: item.estatus_contrato });
    if(item.hasOwnProperty('cantidad_consolidada') && item.cantidad_consolidada != null) Object.assign(itemObj, { quantity: item.cantidad_consolidada });
    if(item.hasOwnProperty('monto') && item.monto != null) Object.assign(itemObj, { valueMxIMSS: item.monto });
    if(item.hasOwnProperty('unidad') && item.unidad != null) Object.assign(itemObj, { unit: { name: item.unidad } });
    else Object.assign(itemObj, { unit: {} });
    if(item.hasOwnProperty('precio_unitario') && item.precio_unitario != null) Object.assign(itemObj.unit, { value: { amount: item.precio_unitario } });
    if(item.hasOwnProperty('precio_unitario_diferencia') && item.precio_unitario_diferencia != null) Object.assign(itemObj.unit.value, { overpriceMxIMSS: item.precio_unitario_diferencia });
    if(item.hasOwnProperty('precio_ponderado') && item.precio_ponderado != null) Object.assign(itemObj.unit.value, { valueAverageMxIMSS: item.precio_ponderado });
    if(item.hasOwnProperty('monto_calculado') && item.monto_calculado != null) Object.assign(itemObj.unit.value, { amountCalculatedMxIMSS: item.monto_calculado });
    if(item.hasOwnProperty('monto_diferencia') && item.monto_diferencia != null) Object.assign(itemObj.unit.value, { amountOverpriceMxIMSS: item.monto_diferencia });
    if(item.hasOwnProperty('monto_diferencia_porcentaje') && item.monto_diferencia_porcentaje != null) Object.assign(itemObj.unit.value, { percentageOverpriceMxIMSS: item.monto_diferencia_porcentaje });
    if(item.hasOwnProperty('contrato_con_sobrecosto') && item.contrato_con_sobrecosto != null) Object.assign(itemObj.unit.value, { hasOverpriceMxIMSS: (item.contrato_con_sobrecosto == 'Si')? true : false });

    return itemObj;
}

function getContractItemDescription(item) {
    if(item.hasOwnProperty('classification') && item.classification.hasOwnProperty('description') && item.classification.description != '') return item.classification.description;
    else return item.description;
}

function contractObject(items) {
    const contractObj = {
        id: getTenderID(items[0]),
        awardID: getTenderID(items[0]),
        title: 'Compras ' + items[0].delegacion,
        description: '',
        period: {
            startDate: items[0].fecha_inicio ? dateToISOString(items[0].fecha_inicio) : null,
            endDate: items[0].fecha_fin ? dateToISOString(items[0].fecha_fin) : null,
        },
        multiyearContractMxCnet: items[0].hasOwnProperty('multianual') ? items[0].multianual : false,
        value: {
            currency: 'MXN'
        }
    }
    if(items[0].hasOwnProperty('iva')) Object.assign(contractObj.value, { taxMxIMSS: items[0].iva })

    let total_amount = 0;
    let contractDescription = [];
    let contractItems = [];
    items.map( item => {
        let contractItem = getContractItem(item);
        contractItems.push(contractItem);
        total_amount += item.monto;
        let itemDescription = getContractItemDescription(contractItem);
        contractDescription.push(itemDescription);
    } );
    Object.assign(contractObj, { items: contractItems });
    Object.assign(contractObj.value, { amount: total_amount });
    contractObj.description = 'Items: ' + contractDescription.join(', ');

    return contractObj;
}

function supplierPartyObject(items) {
    let supplierIndex = [];
    let supplierObj = [];
    items.map( item => {
        if(supplierIndex.indexOf(item.proveedor) < 0) {
            supplierIndex.push(item.proveedor);
            let supplier = {
                name: item.proveedor,
                id: laundry.simpleName(laundry.launder(item.proveedor)),
                roles: ['supplier'],
                details: {
                    type: laundry.isCompany(item.proveedor)? 'company' : 'person'
                }
            }
            if(item.hasOwnProperty('rfc') && item.rfc != '') {
                Object.assign(supplier, { additionalIdentifiers: [{
                        id: item.rfc,
                        scheme: 'RFC',
                        legalName: item.proveedor
                    }]
                });
            }
            supplierObj.push(supplier);
        }
    } );

    return supplierObj;
}

function buyerObject(item) {
    const partyName = item.delegacion + ((item.unidad_compradora)? ' ' + ucwords(item.unidad_compradora.toLowerCase()) : '');
    const dependencia = 'Instituto Mexicano del Seguro Social';

    return {
        name: partyName,
        id: laundry.simpleName(laundry.launder(partyName)) + '-' + laundry.simpleName(laundry.launder(dependencia))
    }
}

function getStateValue(string) {
    switch(string) {
        case 'Nivel Central': return '';
        case 'Distrito Federal': return 'Ciudad de México';
        default: return string;
    }
}

function buyerPartyObject(items) {
    const partyName = items[0].delegacion + ((items[0].unidad_compradora)? ' ' + ucwords(items[0].unidad_compradora.toLowerCase()) : '');
    const dependencia = 'Instituto Mexicano del Seguro Social';
    const delegacionMxIMSS = items[0].delegacion;
    const procuringEntityMxIMSS = items[0].unidad_compradora;
    const deliveryEntityMxIMSS = items[0].unidad_entrega;
    const govLevel = (items[0].estado == 'Nivel Central')? 'country' : 'region';
    const estado = getStateValue(items[0].estado);
    const localidad = items[0].hasOwnProperty('localidad')? items[0].localidad : '';

    const address = { countryName: 'México' }
    if(estado) { Object.assign(address, { region: estado }) }
    if(localidad) { Object.assign(address, { locality: items[0].localidad }) }

    const party = {
        id: laundry.simpleName(laundry.launder(partyName)) + '-' + laundry.simpleName(laundry.launder(dependencia)),
        name: partyName,
        roles: ['buyer'],
        address: address,
        memberOf: [
            {
              name: dependencia,
              id: laundry.simpleName(laundry.launder(dependencia)),
              initials: 'IMSS'
            }
        ],
        details: {
            govLevel: govLevel,
            type: 'institution',
            classification: 'unidad-compradora'
        }
    }

    if(delegacionMxIMSS) { Object.assign(party, { delegacionMxIMSS: delegacionMxIMSS }) }
    if(procuringEntityMxIMSS) { Object.assign(party, { procuringEntityMxIMSS: procuringEntityMxIMSS }) }
    if(deliveryEntityMxIMSS) { Object.assign(party, { deliveryEntityMxIMSS: deliveryEntityMxIMSS }) }

    return party;
}

function getParties(items) {
    const array = [
        buyerPartyObject(items),
        ...supplierPartyObject(items),
    ];

    return array.filter(o => (o.name));
}

function releaseTags(item) {
    if(item.hasOwnProperty('estatus_contrato')) {
        switch(item.estatus_contrato) {
            case 'CANCELADO': return 'contractTermination';
            case 'EN PROCESO': return 'contract';
            case 'FINIQUITADO': return 'contractTermination';
            case 'GENERADO': return 'contract';
            case 'NO VIGENTE': return 'contractTermination';
            case 'TERMINADO': return 'contractTermination';
            case 'VIGENTE': return 'contract';
        }
    }
    else return 'contract';
}

function releaseObject(id, items, metadata=null) {
    const parties = getParties(items);

    const release = {
        ocid: getOCID(id),
        id: id,
        initiationType: 'tender',
        tag: [ releaseTags(items[0]) ],
        language: 'es',
        parties,
        buyer: buyerObject(items[0]),
        tender: tenderObject(items),
        awards: [
            awardObject(items),
        ],
        contracts: [
            contractObject(items),
        ],
        publisher: {
            name: "Instituto Mexicano del Seguro Social",
            uri: "http://compras.imss.gob.mx/"
        }
    };

    if (metadata && metadata.dataSource) {
        const dataSource = { id: metadata.dataSource };
        const dataSourceRun = { id: metadata.dataSourceRun };
        Object.assign(release, { source: [ dataSource ], sourceRun: [ dataSourceRun ] });
    }
    return release;
}

module.exports = releaseObject;
