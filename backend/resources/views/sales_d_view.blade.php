@extends('layout')

@section('content')
    <div class="container mt-4">
        <h2 class="text-center text-primary mb-4">لیست مشتریان</h2>

        @if (session('up'))
            <div class="alert alert-success text-center">
                {{ session('up') }}
            </div>
        @endif

        <div class="table-responsive">
            <table class="table table-hover table-bordered text-center">
                <thead class="table-dark">
                    <tr>
                        <th>اسم مشتری</th>
                        <th>شماره فروشات </th>
                        <th>نام دوا</th>
                        <th>تعداد</th>
                        <th>مصرف فی قطی </th>
                        <th>تاریخ درج</th>
                        <th>تاریخ ویرایش </th>
                        <th>عملیات</th>


                    </tr>
                </thead>
                <tbody>
                    @foreach ($salesd as $sales_details)
                        <tr>

                            <td>{{ $sales_details->sales->customer->cust_name  }}</td>
                            <td>{{ $sales_details->sale_id }}</td>
                            <td>{{ $sales_details->Medication->gen_name}}</td>
                            <td>{{ $sales_details->quantity }}</td>
                            <td>{{ $sales_details->unit_price}}</td>
                            <td>{{ $sales_details->created_at}}</td>
                            <td>{{ $sales_details->updated_at}}</td>
                        




                            <td>
                                <a href="{{ route('sales_details_edit', $sales_details->sales_d_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('sales_details_destroy', $sales_details->sales_d_id) }}" method="POST" class="d-inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('آیا مطمئن هستید؟')">حذف</button>
                            </form>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
                <div class="d-flex justify-content-center mt-4">
                    {{ $salesd->links('vendor.pagination.bootstrap-5') }}
                </div>

            </table>


        </div>
    </div>
@endsection

<style>
    body {
        font-family: 'Tahoma', sans-serif;
        background-color: #f8f9fa;
    }

    h2 {
        font-weight: bold;
    }

    .table {
        border-radius: 10px;
        overflow: hidden;
    }

    .table th {
        background: #343a40 !important;
        color: white !important;
    }

    .table tbody tr:nth-child(odd) {
        background: #f2f2f2;
    }

    .table tbody tr:hover {
        background: #d4edda;
        transition: all 0.3s ease-in-out;
    }

    .btn {
        font-weight: bold;
        border-radius: 5px;
    }

    .btn-warning {
        background: #ffbb33;
        border: none;
    }

    .btn-danger {
        background: #dc3545;
        border: none;
    }
</style>
