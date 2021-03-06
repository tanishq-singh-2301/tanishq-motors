import type { NextApiRequest, NextApiResponse } from 'next';
import verifyToken from '../../../lib/verifyToken';
import type { verifyTokenReturn } from '../../../lib/verifyToken';
import type { Invoice, UpdateInvoice } from '../../../lib/invoice';
import { INVOICE } from '../../../database/models/invoice';
import connectToDB from '../../../database/db';

interface error {
    operation: "unsupported" | "not-authenticated" | "duplicate-invoice" | "invoice-number" | "unknown" | "updated-data" | "invoice-data";
    message: string | any;
}

type Data = {
    error: boolean;
    message?: Array<error>;
    data?: any;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<Data>) => {
    const token: string = req.headers["auth-token"] as string;
    const verified: verifyTokenReturn = verifyToken(token as string);

    if (!verified.success)
        return res.status(200).json({ error: true, message: [{ operation: "not-authenticated", message: "user not authenticated" }] })

    switch (req.method) {
        case "GET": // get invoice

            const invoiceNumber: number = parseInt(req.headers["invoice-number"] as string) || -1;

            if (invoiceNumber === -1) return res.status(200).json({ error: true, message: [{ operation: "invoice-number", message: "invoice number not found, (set in header)." }] })

            try {
                await connectToDB();

                await INVOICE.find({
                    user: verified.data?._id,
                    invoiceNumber: invoiceNumber
                })
                    .then(result => res.status(200).json({ error: false, data: result }))
                    .catch(err_ => res.status(200).json({ error: true, message: [{ operation: "unknown", message: err_.message }] }));

            } catch (error_) {
                res.status(200).json({ error: true, message: [{ operation: "unknown", message: error_ }] })
            }
            break;

        case "POST": // create new invoice
            const data: Invoice = req.body.data;

            if (!data) return res.status(200).json({ error: true, message: [{ operation: "invoice-data", message: "invoice data not given" }] })

            data.user = verified.data?._id;

            await connectToDB();

            await INVOICE.create(data)
                .then(result => {
                    return res.status(200).json({ error: false, data: result })
                })
                .catch(err_ => {
                    if (err_.code === 11000)
                        return res.status(200).json({ error: true, message: [{ operation: "duplicate-invoice", message: "Purchase with this invoice number already exists" }] })

                    return res.status(200).json({ error: true, message: [{ operation: "unknown", message: err_._message }] })
                });

            break;

        case "PUT": // update old invoice
            const invoiceNumberForUpdatation: number = parseInt(req.headers['invoice-number'] as string);
            const updatedInvoice: UpdateInvoice = req.body['updated-invoice'];

            if (!invoiceNumberForUpdatation || invoiceNumberForUpdatation === -1) return res.status(200).json({ error: true, message: [{ operation: "invoice-number", message: "invoice number not given" }] })

            await connectToDB();

            await INVOICE.findOneAndUpdate({ user: verified.data?._id, invoiceNumber: invoiceNumberForUpdatation }, updatedInvoice)
                .then(() => res.status(200).json({ error: false }))
                .catch(err_ => res.status(200).json({ error: true, message: [{ operation: "unknown", message: err_.code }] }));

            break;

        case "DELETE": // delete old invoice
            const invoiceNumberForDeletion: number = parseInt(req.headers['invoice-number'] as string);
            if (!invoiceNumberForDeletion || invoiceNumberForDeletion === -1) return res.status(200).json({ error: true, message: [{ operation: "invoice-number", message: "invoice number not given, set as header(invoice-number)" }] })

            await connectToDB();

            await INVOICE.findOneAndDelete({ user: verified.data?._id, invoiceNumber: invoiceNumberForDeletion })
                .then(() => res.status(200).json({ error: false, data: "deleted" }))
                .catch(err_ => res.status(200).json({ error: true, message: [{ operation: "unknown", message: err_.code }] }))

            break;

        default:
            res.status(200).json({ error: true, message: [{ operation: "unsupported", message: `Method (${req.method as string}) is not supported.` }] });
    }
}

export default handler;

// const dummyData: Invoice = {
    // "invoiceNumber": 1,
    // "hypothecation": "SBI BANK",
    // "nameOfBuyer": "buyers name",
    // "addressOfBuyer": "address of buyer",
    // "mobileNoOfBuyer": 1234567890,
    // "description": "desc",
    // "items": [
    //     {
    //         "serialNumber": 1234,
    //         "itemName": "riksha",
    //         "quantity": 1,
    //         "amount": 100000,
    //         "hirePurchase_or_Lease_or_hypothecationWith": "Na",
    //         "classOfVechile": "ELECTRIC VEICHLE",
    //         "makersName": "makers name",
    //         "chassisNo": "chassis no",
    //         "EngineNumber": 123,
    //         "hoursePower": "720 Watt",
    //         "fuelUsed": "Batteries",
    //         "numberOfBatteries": 4,
    //         "yearOfManufacture": "Dec 2022",
    //         "seatingCapacity": "4 + 1",
    //         "unladenWeight": 685,
    //         "maximAxleWeight": {
    //             "frontAxle": 1,
    //             "rearAxle": 2,
    //             "anyOtherAxle": 3,
    //             "tandemAxle": 4
    //         },
    //         "bodyColor": "black",
    //         "grossVehicleWeight": 723,
    //         "typeOfBody": "steel",
    //         "bharatStage": "bharat stage",
    //         "tradeCertificateNumber": "trade certificate number",
    //         "tankNumber": "tank number",
    //         "waporizerNumber": "waporizer number"
    //     }
    // ]
// }