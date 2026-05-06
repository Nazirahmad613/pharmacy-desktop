@extends('layout')

@section('content')
<div class="container mt-4">
    <h2 class="text-center text-primary mb-4">لیست داروها</h2>

    @if(session('success'))
        <div class="alert alert-success text-center">
            {{ session('success') }}
            {{ session('up')}}
            {{ session('del')}}
        </div>
    @endif

    <div class="table-responsive">
        <table class="table table-hover table-bordered text-center">
            <thead class="table-dark">
                <tr>
                   
                    <th>نام شرکت سازنده</th>
                    <th> نام دوا </th>
                    <th>مجموعه خرید</th>
                    <th>مجموعه پول پرداخت شده </th>
                     
                    <th>عملیات</th>
                  
                </tr>
            </thead>
            <tbody>
                @foreach($supp as $supplier)
                    <tr>
                        
                    <td>{{ $supplier->supplier_name}}</td> 
                    <td>{{ $supplier->medication_name}}</td>
                    <td>{{ $supplier->total_purchased}}</td>
                    <td>{{ $supplier->total_spent}}</td>
                     
                     
                   
                        {{-- <td>
                            <a href="{{ route('inventory_edit', $inventory->invent_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('inventory_destroy', $inventory->invent_id) }}" method="POST" class="d-inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('آیا مطمئن هستید؟')">حذف</button>
                            </form>
                        </td> --}}
                    </tr>
                @endforeach
            </tbody>
        </table>  
        <div class="d-flex justify-content-center mt-4">
            {{-- {{ $supp->links('vendor.pagination.bootstrap-5') }} --}}
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

