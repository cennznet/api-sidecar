import BigNumber from "bignumber.js";
import { supportedAssets } from "./scanNFTStats";

function scientificToDecimal(number) {
    let numberHasSign = number.startsWith("-") || number.startsWith("+");
    let sign = numberHasSign ? number[0] : "";
    number = numberHasSign ? number.replace(sign, "") : number;

    //if the number is in scientific notation remove it
    if (/\d+\.?\d*e[\\+\\-]*\d+/i.test(number)) {
        let zero = '0';
        let parts = String(number).toLowerCase().split('e'); //split into coeff and exponent
        let e = parts.pop();//store the exponential part
        let l = Math.abs(Number(e)); //get the number of zeros
        let sign = Number(e) / l;
        let coeff_array = parts[0].split('.');

        if (sign === -1) {
            coeff_array[0] = String(Math.abs(Number(coeff_array[0])));
            number = zero + '.' + new Array(l).join(zero) + coeff_array.join('');
        } else {
            let dec = coeff_array[1];
            if (dec) l = l - dec.length;
            number = coeff_array.join('') + new Array(l + 1).join(zero);
        }
    }

    return `${sign}${number}`;
}

function bnShift(number, shift) {
    shift = parseInt(shift)
    return new BigNumber(number).shiftedBy(shift).toNumber();
}

export function accuracyFormat(num, assetId) {
    const assetFound = supportedAssets.find(asset => asset.id.toString() === assetId.toString());
    const accuracy = assetFound ? assetFound.decimals : 0;
    if (accuracy) {
        return scientificToDecimal(bnShift(num, -accuracy).toString());
    } else if (accuracy === 0){
        return num;
    } else {
        return '';
    }
}
