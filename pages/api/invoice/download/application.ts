import type { NextApiRequest, NextApiResponse } from 'next';
import verifyToken from '../../../../lib/verifyToken';
import type { verifyTokenReturn } from '../../../../lib/verifyToken';
import INVOICE from '../../../../database/models/invoice';
import connectToDB from '../../../../database/db';
import pdf from 'html-pdf';

const application = require('../../../../html/invoice');

interface error {
    operation: "unsupported" | "not-authenticated" | "_id" | "unknown-error";
    message: string;
}

type Data = {
    error: boolean;
    message?: Array<error>;
    data?: any;
}

const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
    const { cookies, query } = req;
    const token: string = cookies["auth-token"];
    const verified: verifyTokenReturn = verifyToken(token);

    if (!verified.success)
        return res.status(200).json({ error: true, message: [{ operation: "not-authenticated", message: "user not authenticated" }] })

    if (query._id === undefined)
        return res.status(200).json({ error: true, message: [{ operation: "_id", message: "_id not defined" }] })

    switch (req.method) {
        case "GET":
            await connectToDB();

            await INVOICE.findById(query._id)
                .then(result => {
                    if (result === null)
                        return res.status(200).json({ error: true, message: [{ operation: "_id", message: "_id not valid" }] })


                    pdf.create(
                        application(result),
                        {
                            format: "A4"
                        }
                    ).toStream((err, stream) => {
                        res.setHeader("Content-Type", "application/pdf");
                        stream.pipe(res)
                    })

                    // return res.status(200).json({ error: false, data: result })
                })
                .catch(err_ => res.status(200).json({ error: true, message: [{ operation: "unknown-error", message: err_.code }] }));

            break;

        default:
            res.status(200).json({ error: true, message: [{ operation: "unsupported", message: `Method (${req.method as string}) is not supported.` }] });
    }
}

export default handler;