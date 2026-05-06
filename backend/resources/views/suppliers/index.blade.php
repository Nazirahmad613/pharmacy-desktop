<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>لیست تأمین‌کنندگان</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            direction: rtl;
            background: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            flex-direction: column;
        }
        .container {
            width: 80%;
            max-width: 800px;
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
        }
        h2 {
            text-align: center;
            color: #333;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        th, td {
            padding: 10px;
            border: 1px solid #ddd;
            text-align: center;
        }
        th {
            background: #28a745;
            color: white;
        }
        tr:nth-child(even) {
            background: #f9f9f9;
        }
        .add-btn {
            display: inline-block;
            padding: 10px 15px;
            margin: 15px 0;
            background: #007bff;
            color: white;
            border-radius: 5px;
            text-decoration: none;
        }
        .add-btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>لیست تأمین‌کنندگان</h2>

        <a href="{{ route('suppliers.create') }}" class="add-btn">افزودن تأمین‌کننده</a>

        <table>
            <thead>
                <tr>
                    <th>آی دی شرکت</th>
                    <th>نام شرکت</th>
                    <th>شخص مربوطه</th>
                    <th>شماره تماس</th>
                    <th>ایمل آدرس</th>
                    <th>آدرس</th>
                    <th>شماره تماس</th>
                </tr>
            </thead>
            <tbody>
                @foreach($suppliers as $supplier)
                    <tr>
                        <td>{{ $loop->supplier_id}}</td>
                        <td>{{ $loop->name}}</td>
                        <td>{{ $supplier->cont_person }}</td>
                        <td>{{ $supplier->phone_num }}</td>
                        <td>{{ $supplier->email }}</td>
                        <td>{{ $supplier->address }}</td>
                    </tr>
                @endforeach
            </tbody>
        </table>
    </div>
</body>
</html>
