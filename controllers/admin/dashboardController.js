const Order = require("../../models/orderSchema");
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require("path");
const fs = require("fs");

// Ensure the reports directory exists
const reportsDir = path.join(__dirname, '../../reports');
if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
}

module.exports = {
    generateReport: async (req, res) => {
        const { dateRange, startDate, endDate, showDiscounts, overallSales, overallOrders, overallDiscount, format } = req.body;

        try {
            let query = {};
            if (dateRange === "custom") {
                query.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
            } else {
                const now = new Date();
                if (dateRange === "1day") {
                    query.createdAt = { $gte: new Date(now.setDate(now.getDate() - 1)), $lte: new Date() };
                } else if (dateRange === "1week") {
                    query.createdAt = { $gte: new Date(now.setDate(now.getDate() - 7)), $lte: new Date() };
                } else if (dateRange === "1month") {
                    query.createdAt = { $gte: new Date(now.setMonth(now.getMonth() - 1)), $lte: new Date() };
                }
            }

            const orders = await Order.find(query).populate('userId', 'name email').populate('items.productId', 'name price');

            const reportData = {
                totalSales: overallSales ? orders.reduce((acc, order) => acc + order.totalAmount, 0) : undefined,
                totalOrders: overallOrders ? orders.length : undefined,
                totalDiscount: overallDiscount ? orders.reduce((acc, order) => {
                    return acc + order.items.reduce((itemAcc, item) => itemAcc + (item.price - item.discountedPrice) * item.quantity, 0);
                }, 0) : undefined,
                detailedData: showDiscounts ? orders.map(order => ({
                    orderId: order._id,
                    userId: order.userId,
                    items: order.items.map(item => ({
                        productName: item.productName,
                        price: item.price,
                        discountedPrice: item.discountedPrice,
                        quantity: item.quantity,
                        status: item.status,
                        returnReason: item.returnReason
                    })),
                    totalAmount: order.totalAmount,
                    status: order.status,
                    createdAt: order.createdAt
                })) : undefined
            };

            if (format === "pdf") {
                const filePath = path.join(reportsDir, 'report.pdf');
                generatePDF(reportData, filePath, (filePath) => {
                    res.download(filePath, () => {
                        // Delete the file after download
                        fs.unlinkSync(filePath);
                    });
                });
            } else if (format === "excel") {
                const filePath = path.join(reportsDir, 'report.xlsx');
                generateExcel(reportData, filePath, (filePath) => {
                    res.download(filePath, () => {
                        // Delete the file after download
                        fs.unlinkSync(filePath);
                    });
                });
            } else {
                res.json(reportData);
            }
        } catch (error) {
            console.error("Error generating report:", error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
};

function generatePDF(data, filePath, callback) {
    const doc = new PDFDocument({ margin: 50 }); // Adjusted margin to 50 for better spacing
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Title
    doc.fontSize(20).font('Helvetica-Bold').text('Sales Report', { align: 'center' });
    doc.moveDown(1.5);

    // Summary Section
    doc.fontSize(14).font('Helvetica-Bold').text('Summary:');
    doc.fontSize(12).font('Helvetica');

    if (data.totalSales !== undefined) {
        doc.text(`Total Sales: \u20B9 ${data.totalSales.toFixed(2)}`);
    }
    if (data.totalOrders !== undefined) {
        doc.text(`Total Orders: ${data.totalOrders}`);
    }
    if (data.totalDiscount !== undefined) {
        doc.text(`Total Discount: \u20B9 ${data.totalDiscount.toFixed(2)}`);
    }
    doc.moveDown(1.5);

    // Table Headers
    if (data.detailedData && data.detailedData.length > 0) {
        doc.fontSize(14).font('Helvetica-Bold').text('Detailed Orders:', { align: 'left' });
        doc.moveDown(0.5);

        const tableTop = doc.y;
        const rowHeight = 25;
        const columnWidths = [135, 140, 60, 70, 70];
        const startX = 50; // Left padding

        const headers = ['Order ID', 'User', 'Amount ', 'Status', 'Created At'];
        const headerX = columnWidths.reduce((acc, width, i) => {
            acc.push((i === 0 ? startX : acc[i - 1] + columnWidths[i - 1] + 10));
            return acc;
        }, []);

        // Draw Header Row
        doc.font('Helvetica-Bold').fontSize(12);
        for (let i = 0; i < headers.length; i++) {
            doc.text(headers[i], headerX[i], tableTop, { width: columnWidths[i], align: 'left' });
        }
        doc.moveDown(0.5);

        doc.moveTo(startX, tableTop + 15).lineTo(570, tableTop + 15).stroke(); // Draw header underline

        // Draw Data Rows
        doc.font('Helvetica').fontSize(10);
        let yPosition = tableTop + rowHeight;

        data.detailedData.forEach(order => {
            if (yPosition + rowHeight > 750) { // Check for page break
                doc.addPage();
                yPosition = 50;
            }

            doc.text(order.orderId, headerX[0], yPosition, { width: columnWidths[0], align: 'left' });
            doc.text(`${order.userId.name} (${order.userId.email})`, headerX[1], yPosition, { width: columnWidths[1], align: 'left' });
            doc.text(`₹ ${order.totalAmount.toFixed(2)}`, headerX[2], yPosition, { width: columnWidths[2], align: 'left' });
            doc.text(order.status, headerX[3], yPosition, { width: columnWidths[3], align: 'left' });
            doc.text(order.createdAt.toISOString().split('T')[0], headerX[4], yPosition, { width: columnWidths[4], align: 'left' });
            
            yPosition += rowHeight;
        });

        // Final underline
        doc.moveTo(startX, yPosition).lineTo(570, yPosition).stroke();
    }

    doc.end();
    stream.on('finish', () => {
        callback(filePath);
    });
}


function generateExcel(data, filePath, callback) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
        { header: 'Order ID', key: 'orderId', width: 20 },
        { header: 'User', key: 'user', width: 30 },
        { header: 'Total Amount', key: 'totalAmount', width: 15 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    if (data.detailedData) {
        data.detailedData.forEach(order => {
            worksheet.addRow({
                orderId: order.orderId,
                user: `${order.userId.name} (${order.userId.email})`,
                totalAmount: order.totalAmount,
                status: order.status,
                createdAt: order.createdAt.toISOString()
            });
        });
    }

    workbook.xlsx.writeFile(filePath).then(() => {
        callback(filePath);
    });
}