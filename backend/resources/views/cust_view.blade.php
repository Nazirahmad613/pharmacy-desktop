@extends('layout')

@section('content')
    <div class="container mt-4">
        <h2 class="text-center text-primary mb-4">لیست مشتریان</h2>

        @if (session('success'))
            <div class="alert alert-success text-center">
                {{ session('success') }}
            </div>
        @endif
        {{session('success')}}

        <div class="table-responsive">
            <table class="table table-hover table-bordered text-center">
                <thead class="table-dark">
                    <tr>
                        <th>نام مشتری</th>
                        <th>تخلص</th>
                        <th>شماره تماس</th>
                        <th>ایمل</th>
                        <th>آدرس</th>
                        <th>عملیات</th>


                    </tr>
                </thead>
                <tbody>
                    @foreach ($view as $cust)
                        <tr>

                            <td>{{ $cust->cust_name }}</td>
                            <td>{{ $cust->cust_last_name }}</td>
                            <td>{{ $cust->cust_phone_num }}</td>
                            <td>{{ $cust->cust_email }}</td>
                            <td>{{ $cust->cust_address }}</td>




                            <td>
                                <a href="{{ route('customer_edit', $cust->customer_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('customer_destroy', $cust->customer_id) }}" method="POST" class="d-inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('آیا مطمئن هستید؟')">حذف</button>
                            </form>
                            </td>
                        </tr>
                    @endforeach
                </tbody>
                

            </table>
            <div class="d-flex justify-content-center mt-4">
                {{ $view->links('vendor.pagination.bootstrap-5') }}
            </div>

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
