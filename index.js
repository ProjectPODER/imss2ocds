const JSONStream = require('JSONStream');
const es = require('event-stream');
const releaseObject = require('./lib/release.js');

let items = {};
let metadata = {
    dataSource: 'comprasimss',
    dataSourceRun: 'comprasimss-' + Date.now()
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
        let contracts = splitByDate(item);
        contracts.map( (c, i) => {
            let id = (i >= 1)? key + '-' + i : key;
            if(c.length > 0) {
                c.map( purchase => {
                    let release = releaseObject(id, [purchase], metadata);
                    process.stdout.write( JSON.stringify(release) );
                    process.stdout.write( "\n" );
                } );
            }
        });
        delete item;
        delete release;
    });

    process.exit(0);
});

function splitByDate(rows) {
    let dates = {};
    rows.map(row => {
        let dateIndex = row.fecha_inicio.replace(/-/g, '_');
        if(!dates.hasOwnProperty(dateIndex)) {
            dates[dateIndex] = [];
            dates[dateIndex].push(row);
        }
        else dates[dateIndex].push(row);
    });

    let contracts = [];
    Object.keys(dates).map(date => { contracts.push(dates[date]) });
    return contracts;
}

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

    // if(obj.hasOwnProperty('unidad_compradora')) {
    //     let uc = getUCCode(obj.unidad_compradora);
    //     if(uc != '') id.push(uc);
    //     else console.log(obj.unidad_compradora);
    // }
    // else {
        let delegacion = getDelegacionCode(obj.delegacion);
        if(delegacion != '') id.push(delegacion);
    // }

    switch(presence) {
        case 'PF':
            if(!num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_factura != num_procedimiento)
                id.push(num_factura);
            break;
        case 'PC':
            if(!num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_contrato != num_procedimiento)
                id.push(num_contrato);
            break;
        case 'P':
            if(!num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            else id.push(obj.id_ficha);
            break;
        case 'PNO':
            if(!num_procedimiento.match(/^[a-zA-Z]*$/) )
                id.push(num_procedimiento);
            if(num_pedido != num_procedimiento)
                id.push(num_pedido);
            if(num_orden_compra != num_pedido)
                id.push(num_orden_compra);
            break;
        case 'C':
            if(!num_contrato.match(/^[a-zA-Z]*$/) )
                id.push(num_contrato);
            else id.push(obj.id_ficha);
            break;
        default:
            id.push(obj.id_ficha);
            break;
    }

    return id.join('-');
}

function getUCCode(string) {
    switch(string) {
        case "ALMACEN DELEGACIONAL EN EL D.F. ZONA SUR": return "050GYR025";
        case "ALMACEN DELEGACIONAL EN EL D.F. ZONA NORTE": return "050GYR016";
        case 'UMAE TRAUMA Y ORTO M.S. "DR. VICTORIO DE LA FUENTE NARVAEZ" (D.F. NORT': return "050GYR049";
        case "UMAE HOSPITAL GENERAL C.M.N. LA RAZA": return "050GYR043";
        case "UMAE ESPECIALIDADES C.M.N. SIGLO XXI": return "050GYR998";
        case "UMAE ESPECIALIDADES C.M.N. LA RAZA": return "050GYR055";
        case "UMAE ONCOLOGIA C.M.N. SIGLO XXI": return "050GYR051";
        case "UMAE CARDIOLOGIA C.M.N. SIGLO XXI": return "050GYR057";
        case "UMAE PEDIATRIA C.M.N. SIGLO XXI": return "050GYR067";
        case "UMAE GINECO - OBSTETRICIA LA RAZA": return "050GYR050";
        case "UMAE GINECO - OBSTETRICIA LA RAZA - FARMACIA": return "050GYR050";
        case "UMAE GINECO - OBSTETRICIA No. 4 (D.F. SUR)": return "050GYR036";
        case "ALMACEN DELEGACIONAL EN JALISCO": return "050GYR002";
        case "UMAE ESPECIALIDADES JALISCO": return "050GYR020";
        case "UMAE PEDIATRIA JALISCO": return "050GYR060";
        case "UMAE GINECO - OBSTETRICIA JALISCO": return "050GYR079";
        case "ALMACEN DELEGACIONAL EN SONORA": return "050GYR031";
        case "UMAE ESPECIALIDADES SONORA": return "050GYR037";
        case "ALMACEN DELEGACIONAL EN VERACRUZ NORTE": return "050GYR039";
        case "ALMACEN DELEGACIONAL EN VERACRUZ PUERTO (EXT. BIENES TERAPEUTICOS)": return "050GYR014";
        case "ALMACEN DELEGACIONAL EN VERACRUZ SUR": return "050GYR022";
        case "UMAE ESPECIALIDADES VERACRUZ (NTE.)": return "050GYR014";
        case "ALMACEN DELEGACIONAL EN BAJA CALIFORNIA NORTE": return "050GYR003";
        case "ALMACEN DELEGACIONAL EN COAHUILA": return "050GYR026";
        case "UMAE ESPECIALIDADES COAHUILA": return "050GYR045";
        case "UMAE ESPECIALIDADES COAHUILA - SU-ALMACEN": return "050GYR045";
        case "ALMACEN DELEGACIONAL EN NUEVO LEON": return "050GYR035";
        case "H Gineco-Obstetricia 23 Felix Residencia De Conservacion-Res": return "050GYR088";
        case "UMAE ESPECIALIDADES NUEVO LEON": return "050GYR059";
        case "UMAE CARDIOLOGIA EN NUEVO LEON": return "050GYR076";
        case "UMAE TRAUMATOLOGIA Y ORTOPEDIA NUEVO LEON": return "050GYR082";
        case "UMAE GINECO - OBSTETRICIA NUEVO LEON": return "050GYR088";
        case "ALMACEN DELEGACIONAL EN CHIHUAHUA": return "050GYR009";
        case "ALMACEN DELEGACIONAL EN SINALOA": return "050GYR029";
        case "ALMACEN DELEGACIONAL EN EL ESTADO DE MEXICO PONIENTE": return "050GYR024";
        case "ALMACEN DELEGACIONAL EN ESTADO DE MEXICO ORIENTE": return "050GYR028";
        case "UMAE TRAUMATOLOGIA Y ORTOPEDIA LOMAS VERDES": return "050GYR071";
        case "UMAE TRAUMATOLOGIA Y ORTOPEDIA LOMAS VERDES - FARMACIA": return "050GYR071";
        case "ALMACEN DELEGACIONAL EN GUANAJUATO": return "050GYR027";
        case "UMAE ESPECIALIDADES GUANAJUATO": return "050GYR058";
        case "UMAE GINECO - PEDIATRIA GUANAJUATO": return "050GYR074";
        case "ALMACEN DELEGACIONAL EN PUEBLA": return "050GYR006";
        case "UMAE ESPECIALIDADES PUEBLA": return "050GYR046";
        case "UMAE TRAUMATOLOGIA Y ORTOPEDIA PUEBLA": return "050GYR091";
        case "UMAE TRAUMATOLOGIA Y ORTOPEDIA PUEBLA - SUB-ALMACEN": return "050GYR091";
        case "ALMACEN DELEGACIONAL EN OAXACA": return "050GYR013";
        case "ALMACEN DELEGACIONAL EN TAMAULIPAS": return "050GYR018";
        case "ALMACEN DELEGACIONAL EN SAN LUIS POTOSI": return "050GYR023";
        case "ALMACEN DELEGACIONAL EN BAJA CALIFORNIA SUR": return "050GYR030";
        case "Ofnas Centrales -Reforma- Coordinacion De Abastecimiento": return "050GYR047";
        case "ALMACEN DE PROGRAMAS ESPECIALES Y RED FRIA": return "050GYR047B";
        case "ALMACEN DELEGACIONAL EN DURANGO": return "050GYR010";
        case "ALMACEN SUBDELEGACIONAL EN TAPACHULA, CHIAPAS": return "050GYR004";
        case "ALMACEN SUBDELEGACIONAL EN TUXTLA GUTIERREZ, CHIAPAS": return "050GYR004";
        case "ALMACEN DELEGACIONAL EN COLIMA": return "050GYR012";
        case "ALMACEN DELEGACIONAL EN YUCATAN": return "050GYR011";
        case "UMAE ESPECIALIDADES YUCATAN": return "050GYR063";
        case "ALMACEN DELEGACIONAL EN MORELOS": return "050GYR007";
        case "ALMACEN DELEGACIONAL EN QUINTANA ROO": return "050GYR008";
        case "ALMACEN DELEGACIONAL EN MICHOACAN": return "050GYR033";
        case "ALMACEN DELEGACIONAL EN GUERRERO": return "050GYR001";
        case "ALMACEN DELEGACIONAL EN HIDALGO": return "050GYR017";
        case "ALMACEN DELEGACIONAL EN QUERETARO": return "050GYR075";
        case "ALMACEN DELEGACIONAL EN ZACATECAS": return "050GYR034";
        case "ALMACEN DELEGACIONAL EN AGUASCALIENTES": return "050GYR032";
        case "H Gral Zona 2 Almacen De Unidad Medica": return "050GYR032";
        case "ALMACEN DELEGACIONAL EN CAMPECHE": return "050GYR069";
        case "ALMACEN DELEGACIONAL EN TABASCO": return "050GYR015";
        case "ALMACEN DELEGACIONAL EN NAYARIT": return "050GYR005";
        case "ALMACEN DELEGACIONAL EN TLAXCALA": return "050GYR041";
        default: return '';
    }
}

function getDelegacionCode(string) {
    switch(string) {
        case 'Delegaci??n Aguascalientes': return 'AGS';
        case 'Delegaci??n Baja California': return 'BC';
        case 'Delegaci??n Baja California Sur': return 'BCS';
        case 'Delegaci??n Campeche': return 'CAMP';
        case 'Delegaci??n Chiapas': return 'CHIS';
        case 'Delegaci??n Chihuahua': return 'CHIH';
        case 'Delegaci??n Coahuila': return 'COAH';
        case 'H. de Especialidades N??m 71, Torre??n, Coahuila': return 'COAH-HE-71';
        case 'Delegaci??n Colima': return 'COL';
        case 'Delegaci??n Sur del DF': return 'CDMX-S';
        case 'Delegaci??n Norte del DF': return 'CDMX-N';
        case 'H. Traumatolog??a "Dr. Victorio De La Fuente Narv??ez"': return 'CDMX-HT-VDLFN';
        case 'H. General, "Dr. Gaudencio Gonz??lez Garza" Centro M??dico Nacional La Raza': return 'CDMX-HG-GGG';
        case 'H. de Especialidades, "Dr. Bernardo Sepulveda Guti??rrez" Centro M??dico Nacional Siglo XXI': return 'CDMX-HE-BSG';
        case 'H. de Especialidades, "Dr. Antonio Fraga Mouret" Centro M??dico Nacional La Raza': return 'CDMX-HE-AFM';
        case 'H. de Oncolog??a, Centro M??dico Nacional Siglo XXI': return 'CDMX-HO-CMNSXXI';
        case 'H. de Cardiolog??a, Centro M??dico Nacional Siglo XXI': return 'CDMX-HC-CMNSXXI';
        case 'H. de Pediatr??a, Centro M??dico Nacional Siglo XXI': return 'CDMX-HT-CMNSXXI';
        case 'H. de Gineco Obstetricia No. 3 "Dr. V??ctor Manuel Espinosa de los Reyes S??nchez" La Raza': return 'CDMX-HGO-3';
        case 'H. de Gineco Obstetricia N??m. 4 "Dr. Luis Castelazo Ayala"': return 'CDMX-HGO-4';
        case 'Delegaci??n Durango': return 'DGO';
        case 'Delegaci??n Estado de M??xico Poniente': return 'MEX-P';
        case 'Delegaci??n Estado de M??xico Oriente': return 'MEX-O';
        case 'H. de Traumatolog??a y Ortopedia, Lomas Verdes': return 'MEX-HTO-LV';
        case 'Delegaci??n Guanajuato': return 'GTO';
        case 'H. de Especialidades No. 1 Centro M??dico Nacional del Bajio, Le??n, Gto.': return 'GTO-HE-1';
        case 'H. de Gineco Pediatr??a N??m 48, Le??n Gto.': return 'GTO-HGP-48';
        case 'Delegaci??n Guerrero': return 'GRO';
        case 'Delegaci??n Hidalgo': return 'HGO';
        case 'Delegaci??n Jalisco': return 'JAL';
        case 'H. de Especialidades, "Lic. Ignacio Garc??a Tellez" Centro M??dico Nacional de Occidente, Jalisco': return 'JAL-HE-IGT';
        case 'H. de Pediatr??a, "Lic. Ignacio Garc??a Tellez" Centro M??dico Nacional de Occidente, Jalisco.': return 'JAL-HP-IGT';
        case 'H. de Gineco Obstetricia, "Lic. Ignacio Garc??a Tellez", Centro M??dico Nacional de Occidente, Jalisco': return 'JAL-HO-IGT';
        case 'Delegaci??n Michoac??n': return 'MICH';
        case 'Delegaci??n Morelos': return 'MOR';
        case 'Delegaci??n Nayarit': return 'NAY';
        case 'Oficinas Centrales': return 'OC';
        case 'Delegaci??n Nuevo Le??n': return 'NL';
        case 'H. de Especialidades N??m 25, Monterrey, N.L.': return 'NL-HE-25';
        case 'H. de Especialidades Cardiol??gicas No. 34, Centro M??dico Nacional del Noreste.': return 'NL-HEC-34';
        case 'H. de Traumatolog??a y Ortopedia, N??m. 21, Monterrey, N.L.': return 'NL-HTO-21';
        case 'H. de Gineco Obstetricia N??m. 23, "Ignacio Morones Prieto" Monterrey, N.L.': return 'NL-HGO-23';
        case 'Delegaci??n Oaxaca': return 'OAX';
        case 'Delegaci??n Puebla': return 'PUE';
        case 'H. de Especialidades, "Gral. Div. Manuel Avila Camacho", Centro M??dico Nacional, Puebla': return 'PUE-HE-MAC';
        case 'H. de Traumatolog??a y Ortopedia, "Gral. Div. Manuel Avila Camacho", Centro M??dico Nacional, Puebla': return 'PUE-HTO-MAC';
        case 'Delegaci??n Quer??taro': return 'QRO';
        case 'Delegaci??n Quintana Roo': return 'QROO';
        case 'Delegaci??n San Luis Potos??': return 'SLP';
        case 'Delegaci??n Sinaloa': return 'SIN';
        case 'Delegaci??n Sonora': return 'SON';
        case 'H. de Especialidades No. 2, "Luis Donaldo Colosio Murrieta", Centro M??dico Nacional del Noroeste, Cd. Obreg??n Sonora': return 'SON-HE-2';
        case 'Delegaci??n Tabasco': return 'TAB';
        case 'Delegaci??n Tamaulipas': return 'TAMPS';
        case 'Delegaci??n Tlaxcala': return 'TLAX';
        case 'Delegaci??n Veracruz Norte': return 'VER-N';
        case 'Delegaci??n Veracruz Sur': return 'VER-S';
        case 'H. de Especialidades No. 14 "Adolfo Ru??z Cortines", Veracruz.': return 'VER-HE-14';
        case 'Delegaci??n Yucat??n': return 'YUC';
        case 'H. de Especialidades No. 1, "Lic. Ignacio Garc??a Tellez" M??rida, Yucat??n.': return 'YUC-HE-1';
        case 'Delegaci??n Zacatecas': return 'ZAC';
        default: return '';
    }
}
