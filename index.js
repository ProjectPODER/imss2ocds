const JSONStream = require('JSONStream');
const es = require('event-stream');
const releaseObject = require('./lib/release.js');

let items = {};
let metadata = {
    dataSource: [ {id: 'imss'} ]
}

console.time('duration');

process.stdin.setEncoding('utf8');
process.stdin
    .pipe(es.split())
    .pipe(es.parse())
    .pipe(es.mapSync(function (doc) {
        let obj = doc._source;
        let id = getItemID(obj);
        if(items.hasOwnProperty(id)) {
            items[id].push(obj);
        }
        else {
            items[id] = []
            items[id].push(obj);
        }
    }));


process.stdin.on('end', () => {
    Object.keys(items).map(key => {
        let item = items[key];
        let release = releaseObject(key, item, metadata);
        process.stdout.write( JSON.stringify(release) );
        process.stdout.write( "\n" );
        delete item;
        delete release;
    });

    process.exit(0);
});

function getItemID(obj) {
    let id = [];
    let num_procedimiento = obj.hasOwnProperty('num_procedimiento')? obj.num_procedimiento.trim() : null;
    let num_contrato = obj.hasOwnProperty('num_contrato')? obj.num_contrato.trim() : null;
    let num_factura = obj.hasOwnProperty('num_factura')? obj.num_factura.trim() : null;
    let num_pedido = obj.hasOwnProperty('num_pedido')? obj.num_pedido.trim() : null;
    let num_orden_compra = obj.hasOwnProperty('num_orden_compra')? obj.num_orden_compra.trim() : null;

    let presence = '';
    if(num_procedimiento) presence += 'P';
    if(num_contrato) presence += 'C';
    if(num_factura) presence += 'F';
    if(num_pedido) presence += 'N';
    if(num_orden_compra) presence += 'O';

    let delegacion = getDelegacionCode(obj.delegacion);
    if(delegacion != '') id.push(delegacion);

    switch(presence) {
        case 'PF':
            if(num_procedimiento.length >= 3 && !num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_factura != num_procedimiento)
                id.push(num_factura);
            break;
        case 'PC':
            if(num_procedimiento.length >= 3 && !num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_contrato != num_procedimiento)
                id.push(num_contrato);
            break;
        case 'P':
            if(num_procedimiento.length >= 3 && !num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            else id.push(obj.id_ficha);
            break;
        case 'PNO':
            if(num_procedimiento.length >= 3 && !num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_pedido != num_procedimiento)
                id.push(num_pedido);
            if(num_orden_compra != num_pedido)
                id.push(num_orden_compra);
            break;
        case 'C':
            if(num_contrato.length >= 3 && !num_contrato.match(/^[a-zA-Z]*$/) )
                id.push(num_contrato);
            else id.push(obj.id_ficha);
            break;
        default:
            id.push(obj.id_ficha);
            break;
    }

    return id.join('-');
}

function getDelegacionCode(string) {
    switch(string) {
        case 'Delegación Aguascalientes': return 'AGS';
        case 'Delegación Baja California': return 'BC';
        case 'Delegación Baja California Sur': return 'BCS';
        case 'Delegación Campeche': return 'CAMP';
        case 'Delegación Chiapas': return 'CHIS';
        case 'Delegación Chihuahua': return 'CHIH';
        case 'Delegación Coahuila': return 'COAH';
        case 'H. de Especialidades Núm 71, Torreón, Coahuila': return 'COAH-HE-71';
        case 'Delegación Colima': return 'COL';
        case 'Delegación Sur del DF': return 'CDMX-S';
        case 'Delegación Norte del DF': return 'CDMX-N';
        case 'H. Traumatología "Dr. Victorio De La Fuente Narváez"': return 'CDMX-HT-VDLFN';
        case 'H. General, "Dr. Gaudencio González Garza" Centro Médico Nacional La Raza': return 'CDMX-HG-GGG';
        case 'H. de Especialidades, "Dr. Bernardo Sepulveda Gutiérrez" Centro Médico Nacional Siglo XXI': return 'CDMX-HE-BSG';
        case 'H. de Especialidades, "Dr. Antonio Fraga Mouret" Centro Médico Nacional La Raza': return 'CDMX-HE-AFM';
        case 'H. de Oncología, Centro Médico Nacional Siglo XXI': return 'CDMX-HO-CMNSXXI';
        case 'H. de Cardiología, Centro Médico Nacional Siglo XXI': return 'CDMX-HC-CMNSXXI';
        case 'H. de Pediatría, Centro Médico Nacional Siglo XXI': return 'CDMX-HT-CMNSXXI';
        case 'H. de Gineco Obstetricia No. 3 "Dr. Víctor Manuel Espinosa de los Reyes Sánchez" La Raza': return 'CDMX-HGO-3';
        case 'H. de Gineco Obstetricia Núm. 4 "Dr. Luis Castelazo Ayala"': return 'CDMX-HGO-4';
        case 'Delegación Durango': return 'DGO';
        case 'Delegación Estado de México Poniente': return 'MEX-P';
        case 'Delegación Estado de México Oriente': return 'MEX-O';
        case 'H. de Traumatología y Ortopedia, Lomas Verdes': return 'MEX-HTO-LV';
        case 'Delegación Guanajuato': return 'GTO';
        case 'H. de Especialidades No. 1 Centro Médico Nacional del Bajio, León, Gto.': return 'GTO-HE-1';
        case 'H. de Gineco Pediatría Núm 48, León Gto.': return 'GTO-HGP-48';
        case 'Delegación Guerrero': return 'GRO';
        case 'Delegación Hidalgo': return 'HGO';
        case 'Delegación Jalisco': return 'JAL';
        case 'H. de Especialidades, "Lic. Ignacio García Tellez" Centro Médico Nacional de Occidente, Jalisco': return 'JAL-HE-IGT';
        case 'H. de Pediatría, "Lic. Ignacio García Tellez" Centro Médico Nacional de Occidente, Jalisco.': return 'JAL-HP-IGT';
        case 'H. de Gineco Obstetricia, "Lic. Ignacio García Tellez", Centro Médico Nacional de Occidente, Jalisco': return 'JAL-HO-IGT';
        case 'Delegación Michoacán': return 'MICH';
        case 'Delegación Morelos': return 'MOR';
        case 'Delegación Nayarit': return 'NAY';
        case 'Oficinas Centrales': return 'OC';
        case 'Delegación Nuevo León': return 'NL';
        case 'H. de Especialidades Núm 25, Monterrey, N.L.': return 'NL-HE-25';
        case 'H. de Especialidades Cardiológicas No. 34, Centro Médico Nacional del Noreste.': return 'NL-HEC-34';
        case 'H. de Traumatología y Ortopedia, Núm. 21, Monterrey, N.L.': return 'NL-HTO-21';
        case 'H. de Gineco Obstetricia Núm. 23, "Ignacio Morones Prieto" Monterrey, N.L.': return 'NL-HGO-23';
        case 'Delegación Oaxaca': return 'OAX';
        case 'Delegación Puebla': return 'PUE';
        case 'H. de Especialidades, "Gral. Div. Manuel Avila Camacho", Centro Médico Nacional, Puebla': return 'PUE-HE-MAC';
        case 'H. de Traumatología y Ortopedia, "Gral. Div. Manuel Avila Camacho", Centro Médico Nacional, Puebla': return 'PUE-HTO-MAC';
        case 'Delegación Querétaro': return 'QRO';
        case 'Delegación Quintana Roo': return 'QROO';
        case 'Delegación San Luis Potosí': return 'SLP';
        case 'Delegación Sinaloa': return 'SIN';
        case 'Delegación Sonora': return 'SON';
        case 'H. de Especialidades No. 2, "Luis Donaldo Colosio Murrieta", Centro Médico Nacional del Noroeste, Cd. Obregón Sonora': return 'SON-HE-2';
        case 'Delegación Tabasco': return 'TAB';
        case 'Delegación Tamaulipas': return 'TAMPS';
        case 'Delegación Tlaxcala': return 'TLAX';
        case 'Delegación Veracruz Norte': return 'VER-N';
        case 'Delegación Veracruz Sur': return 'VER-S';
        case 'H. de Especialidades No. 14 "Adolfo Ruíz Cortines", Veracruz.': return 'VER-HE-14';
        case 'Delegación Yucatán': return 'YUC';
        case 'H. de Especialidades No. 1, "Lic. Ignacio García Tellez" Mérida, Yucatán.': return 'YUC-HE-1';
        case 'Delegación Zacatecas': return 'ZAC';
        default: return '';
    }
}
