$(document).ready(function() {
    // Add event listener to buttons
    $('.btn-primary').on('click', function() {
        // Get the product ID
        var productId = $(this).closest('.card').data('product-id');
        
        // Send AJAX request to get product details
        $.ajax({
            type: 'GET',
            url: 'product-details.php',
            data: {product_id: productId},
            success: function(data) {
                // Display product details
                $('#product-details').html(data);
            }
        });
    });
});