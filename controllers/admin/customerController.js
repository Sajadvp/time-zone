const User = require("../../models/userSchema");

const customerInfo = async (req, res) => {
    try {
        let search = "";
        if (req.query.search) {
            search = req.query.search;
        }
        let page = 1;
        if (req.query.page) {
            page = parseInt(req.query.page, 10);
        }
        const limit = 5;

        // Fetch user data
        const userData = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        // Count total matching documents
        const count = await User.find({
            isAdmin: false,
            $or: [
                { name: { $regex: ".*" + search + ".*", $options: "i" } },
                { email: { $regex: ".*" + search + ".*", $options: "i" } },
            ],
        }).countDocuments();

        // Calculate total pages
        const totalPages = Math.ceil(count / limit);

        // Pass the data to the EJS template
        res.render("admin/customers", {
            data: userData,
            currentPage: page,
            totalPages: totalPages,
        });
    } catch (error) {
        console.error("Error fetching customers:", error);
        res.status(500).send("Internal Server Error");
    }
};



const customerBlocked = async (req, res) => {
    try {
        let id = req.query.id; // Get the ID from query
        const user = await User.findById(id); // Find the user by ID

        if (user) {
            // Block the user
            await User.updateOne({ _id: id }, { $set: { isBlocked: true } });

            // If the logged-in user is the one being blocked, log them out
            if (req.session.user && req.session.user._id.toString() === id) {
                req.session.destroy((err) => {
                    if (err) {
                        console.error("Error during logout:", err);
                        return res.redirect("/pageerror");
                    }
                    res.redirect("/admin/users"); // Redirect to homepage or login page after logout
                });
                return;
            }
        }

        res.redirect("/admin/users"); // Redirect back to the user list after blocking
    } catch (error) {
        console.error("Error blocking customer:", error);
        res.redirect("/pageerror");
    }
};


const customerunBlocked = async (req, res) => {
    try {
        let id = req.query.id; // Get the ID from query
        await User.updateOne({ _id: id }, { $set: { isBlocked: false } }); // Unblock the user
        res.redirect("/admin/users");
    } catch (error) {
        console.error("Error unblocking customer:", error);
        res.redirect("/pageerror");
    }
};






module.exports = {
    customerInfo,
    customerBlocked,
    customerunBlocked,
};
