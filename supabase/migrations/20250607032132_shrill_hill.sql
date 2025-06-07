/*
  # Initial Schema for SuiviVentes Application

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `date` (date)
      - `client_name` (text)
      - `product_name` (text)
      - `quantity` (integer)
      - `unit_price` (decimal)
      - `total_amount` (decimal)
      - `payment_method` (text)
      - `notes` (text, nullable)
      - `seller` (text, nullable)
      - `register` (text, nullable)
      - `category` (text, nullable)
      - `user_id` (uuid, foreign key)

    - `stock_items`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `name` (text)
      - `category` (text)
      - `subcategory` (text)
      - `current_stock` (integer)
      - `alert_threshold` (integer)
      - `initial_stock` (integer)
      - `unit_price` (decimal)
      - `user_id` (uuid, foreign key)

    - `stock_movements`
      - `id` (uuid, primary key)
      - `created_at` (timestamp)
      - `date` (timestamp)
      - `product_id` (uuid, foreign key)
      - `type` (enum: 'in' or 'out')
      - `quantity` (integer)
      - `reason` (text)
      - `register` (text, nullable)
      - `seller` (text, nullable)
      - `user_id` (uuid, foreign key)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can only access their own records

  3. Indexes
    - Add indexes for common query patterns
    - Optimize for date-based queries and product lookups
*/

-- Create custom types
CREATE TYPE stock_movement_type AS ENUM ('in', 'out');

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  date date NOT NULL,
  client_name text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price decimal(10,2) NOT NULL CHECK (unit_price >= 0),
  total_amount decimal(10,2) NOT NULL CHECK (total_amount >= 0),
  payment_method text NOT NULL,
  notes text,
  seller text,
  register text,
  category text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create stock_items table
CREATE TABLE IF NOT EXISTS stock_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  name text NOT NULL,
  category text NOT NULL,
  subcategory text NOT NULL DEFAULT '',
  current_stock integer NOT NULL DEFAULT 0,
  alert_threshold integer NOT NULL DEFAULT 5 CHECK (alert_threshold >= 0),
  initial_stock integer NOT NULL DEFAULT 0 CHECK (initial_stock >= 0),
  unit_price decimal(10,2) NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(name, user_id)
);

-- Create stock_movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  date timestamptz NOT NULL DEFAULT now(),
  product_id uuid NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
  type stock_movement_type NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  reason text NOT NULL,
  register text,
  seller text,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sales
CREATE POLICY "Users can view their own sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sales"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON sales
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON sales
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for stock_items
CREATE POLICY "Users can view their own stock items"
  ON stock_items
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock items"
  ON stock_items
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock items"
  ON stock_items
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock items"
  ON stock_items
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for stock_movements
CREATE POLICY "Users can view their own stock movements"
  ON stock_movements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stock movements"
  ON stock_movements
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stock movements"
  ON stock_movements
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own stock movements"
  ON stock_movements
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(date);
CREATE INDEX IF NOT EXISTS idx_sales_product_name ON sales(product_name);
CREATE INDEX IF NOT EXISTS idx_sales_seller ON sales(seller);
CREATE INDEX IF NOT EXISTS idx_sales_register ON sales(register);

CREATE INDEX IF NOT EXISTS idx_stock_items_user_id ON stock_items(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_name ON stock_items(name);
CREATE INDEX IF NOT EXISTS idx_stock_items_category ON stock_items(category);
CREATE INDEX IF NOT EXISTS idx_stock_items_current_stock ON stock_items(current_stock);

CREATE INDEX IF NOT EXISTS idx_stock_movements_user_id ON stock_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(type);

-- Create a function to automatically update stock when sales are recorded
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease stock when a sale is made
  UPDATE stock_items 
  SET current_stock = current_stock - NEW.quantity
  WHERE name = NEW.product_name 
    AND user_id = NEW.user_id;
  
  -- Insert stock movement record
  INSERT INTO stock_movements (
    product_id,
    type,
    quantity,
    reason,
    register,
    seller,
    user_id,
    date
  )
  SELECT 
    id,
    'out',
    NEW.quantity,
    'Sale #' || NEW.id,
    NEW.register,
    NEW.seller,
    NEW.user_id,
    NEW.date::timestamptz
  FROM stock_items 
  WHERE name = NEW.product_name 
    AND user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update stock on sales
CREATE TRIGGER trigger_update_stock_on_sale
  AFTER INSERT ON sales
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_sale();

-- Create a function to prevent negative stock (optional, can be disabled)
CREATE OR REPLACE FUNCTION check_stock_availability()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if there's enough stock
  IF EXISTS (
    SELECT 1 FROM stock_items 
    WHERE name = NEW.product_name 
      AND user_id = NEW.user_id 
      AND current_stock < NEW.quantity
  ) THEN
    RAISE EXCEPTION 'Insufficient stock for product: %', NEW.product_name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Uncomment the following lines if you want to prevent sales when stock is insufficient
-- CREATE TRIGGER trigger_check_stock_availability
--   BEFORE INSERT ON sales
--   FOR EACH ROW
--   EXECUTE FUNCTION check_stock_availability();