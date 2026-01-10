-- Policy: Admins can delete feedback
CREATE POLICY "Admins can delete feedback"
  ON feedback FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'sarah@darkridge.com'
  );
