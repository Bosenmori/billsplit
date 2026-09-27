import pool from "./db";

export async function calculateGroupBalances(groupId) {

    const memberResult = await pool.query(`
        SELECT u.id AS user_id, u.name
        FROM users u
        JOIN group_members gm ON u.id = gm.user_id
        WHERE gm.group_id = $1
        `, [groupId])
        
    const paidResult = await pool.query(`
        SELECT paid_by, SUM(amount) AS total
        FROM expenses
        WHERE group_id = $1
        GROUP BY paid_by
        `, [groupId]
    )

    const splitResult = await pool.query(`
        SELECT es.user_id, SUM(es.share_amount) AS total 
        FROM expense_splits es
        JOIN expenses e ON e.id = es.expense_id
        WHERE group_id = $1
        GROUP BY es.user_id
        `, [groupId])

    const settlementResult = await pool.query(`
        SELECT from_user_id, to_user_id, amount
        FROM settlements
        WHERE group_id = $1 AND status = 'confirmed'
            `, [groupId])
    const toSatang = (value) => Math.round(Number(value) * 100);
    // console.log(toSatang(500));
    const nets = new Map();
    const names = new Map();
    for (const row of memberResult.rows) {
        nets.set(row.user_id, 0)
    }
    for (const row of memberResult.rows) {
        nets.set(row.user_id, 0);
        names.set(row.user_id, row.name);
    }
    for (const row of paidResult.rows) {
        nets.set(row.paid_by, (nets.get(row.paid_by) ?? 0) + toSatang(row.total));
    }
    for (const row of splitResult.rows) {
        nets.set(row.user_id, (nets.get(row.user_id) ?? 0) - toSatang(row.total));
    }
    for (const row of settlementResult.rows) {
        const amount = toSatang(row.amount);
        nets.set(row.from_user_id, (nets.get(row.from_user_id) ?? 0) + amount);
        nets.set(row.to_user_id, (nets.get(row.to_user_id) ?? 0) - amount);
    }
    //console.log(nets);
    const receiveList = [];
    const payList = [];

    for (const [userId, net] of nets) {
        if (net > 0) {
            receiveList.push({ userId: userId, amount: net })
        } else if (net < 0) {
            payList.push({ userId: userId, amount: -net })
        }
    }
    receiveList.sort((a, b) => b.amount - a.amount);
    payList.sort((a, b) => b.amount - a.amount);

    const transactions = [];
    let i = 0;
    let j = 0;
    while (i < payList.length && j < receiveList.length) {
        const payer = payList[i];
        const receiver = receiveList[j];
        const amount = Math.min(payer.amount, receiver.amount);

        transactions.push({
            from_user_id: payer.userId,
            from_name: names.get(payer.userId),
            to_user_id: receiver.userId,
            to_name: names.get(receiver.userId),
            amount: amount / 100,
        });

        payer.amount -= amount;
        receiver.amount -= amount;
        if (payer.amount === 0) {
            i++;
        }
        if (receiver.amount === 0) {
            j++;
        }
    }

    const balances = memberResult.rows.map((row) => ({
        user_id: row.user_id,
        name: row.name,
        net: nets.get(row.user_id) / 100,
    }));
    return { balances, transactions };
}